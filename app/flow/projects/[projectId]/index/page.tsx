"use client";

import PageWrapper from "@/components/layout/PageWrapper";
import ProjectDetailSidebar from "@/components/flow/projects/project-detail/ProjectDetailSidebar";
import ProjectDetailHeader from "@/components/flow/projects/project-detail/ProjectDetailHeader";
import { useProject } from "@/components/flow/project-context";
import { GlobalLoading } from "@/components/shared/GlobalLoading";
import ProjectIndexView from "@/components/flow/projects/project-detail/setup/index/ProjectIndexView";

export default function ProjectDetailIndexPage() {
  const { project, isLoading, error } = useProject();

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
      <div className="space-y-6 w-full max-w-6xl mx-auto animate-in fade-in duration-500 px-4 md:px-0">
        <ProjectDetailHeader project={projectForHeader as any} />
        <ProjectIndexView
          projectName={project.project_name}
          projectCode={project.project_code}
          projectNumber={project.project_number}
        />
      </div>
    </PageWrapper>
  );
}
