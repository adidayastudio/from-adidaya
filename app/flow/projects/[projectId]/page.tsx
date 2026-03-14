"use client";

import StandardPageWrapper from "@/components/layout/StandardPageWrapper";
import ProjectDetailSidebar from "@/components/flow/projects/project-detail/ProjectDetailSidebar";
import ProjectDetailHeader from "@/components/flow/projects/project-detail/ProjectDetailHeader";
import ProjectDetailOverviewContent from "@/components/flow/projects/project-detail/overview/ProjectDetailOverviewContent";
import { useProject } from "@/components/flow/project-context";
import { mapProjectToHeader } from "@/lib/flow/mappers/project-header";
import { GlobalLoading } from "@/components/shared/GlobalLoading";

export default function ProjectOverviewPage() {
  const { project, isLoading, error } = useProject();

  // Loading state
  if (isLoading) {
    return <GlobalLoading />;
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
    <StandardPageWrapper
      breadcrumbItems={[
        { label: "Flow" },
        { label: "Projects", href: "/flow/projects" },
        { label: breadcrumbLabel },
      ]}
      sidebar={<ProjectDetailSidebar />}
      isTransparent
    >
      <div className="space-y-8 animate-in fade-in duration-500">
        <ProjectDetailHeader project={projectForComponents as any} />
        <ProjectDetailOverviewContent project={projectForComponents as any} />
      </div>
    </StandardPageWrapper>
  );
}
