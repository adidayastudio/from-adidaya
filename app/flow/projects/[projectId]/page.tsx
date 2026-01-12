"use client";

import PageWrapper from "@/components/layout/PageWrapper";
import ProjectDetailSidebar from "@/components/flow/projects/project-detail/ProjectDetailSidebar";
import ProjectDetailHeader from "@/components/flow/projects/project-detail/ProjectDetailHeader";
import ProjectDetailOverviewContent from "@/components/flow/projects/project-detail/overview/ProjectDetailOverviewContent";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { useProject } from "@/components/flow/project-context";
import { mapProjectToHeader } from "@/lib/flow/mappers/project-header";

export default function ProjectOverviewPage() {
  const { project, isLoading, error } = useProject();

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-50">
        <div className="animate-pulse text-neutral-500">Loading project...</div>
      </div>
    );
  }

  // Error state
  if (error || !project) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-50 text-neutral-500">
        {error || "Project not found."}
      </div>
    );
  }

  const breadcrumbLabel = `${project.project_number} - ${project.project_code} - ${project.project_name}`;

  // Use shared mapper
  const projectForComponents = mapProjectToHeader(project);

  return (
    <div className="min-h-screen bg-neutral-50 p-6">
      <Breadcrumb
        items={[
          { label: "Flow" },
          { label: "Projects", href: "/flow/projects" },
          { label: breadcrumbLabel },
        ]}
      />

      <PageWrapper sidebar={<ProjectDetailSidebar />}>
        <div className="space-y-6">
          <ProjectDetailHeader project={projectForComponents as any} />
          <ProjectDetailOverviewContent project={projectForComponents as any} />
        </div>
      </PageWrapper>
    </div>
  );
}
