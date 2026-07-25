"use client";

import { useParams } from "next/navigation";
import StandardPageWrapper from "@/components/layout/StandardPageWrapper";
import ProjectDetailSidebar from "@/components/flow/projects/project-detail/ProjectDetailSidebar";
import { GlobalLoading } from "@/components/shared/GlobalLoading";
import ProjectDetailHeader from "@/components/flow/projects/project-detail/ProjectDetailHeader";
import ProjectDetailDocsContent from "@/components/flow/projects/project-detail/docs/ProjectDetailDocsContent";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { useProject } from "@/components/flow/project-context";

export default function DocsPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const { project, isLoading, error } = useProject();

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
  };

  const breadcrumbLabel = `${project.project_number} - ${project.project_code} - ${project.project_name}`;

  return (
    <StandardPageWrapper
      breadcrumbItems={[
        { label: "Flow" },
        { label: "Projects", href: "/flow/projects" },
        { label: breadcrumbLabel },
        { label: "Docs" }
      ]}
      sidebar={<ProjectDetailSidebar />}
      isTransparent
    >
      <div className="space-y-8 max-w-4xl mx-auto px-4 lg:px-0 animate-in fade-in duration-500">
        <ProjectDetailHeader project={projectForHeader as any} />
        <ProjectDetailDocsContent project={projectForHeader as any} />
      </div>
    </StandardPageWrapper>
  );
}
