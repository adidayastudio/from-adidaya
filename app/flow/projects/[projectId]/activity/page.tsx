"use client";

import { useParams } from "next/navigation";
import PageWrapper from "@/components/layout/PageWrapper";
import ProjectDetailSidebar from "@/components/flow/projects/project-detail/ProjectDetailSidebar";
import ProjectDetailHeader from "@/components/flow/projects/project-detail/ProjectDetailHeader";
import ProjectDetailActivityContent from "@/components/flow/projects/project-detail/activity/ProjectDetailActivityContent";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { useProject } from "@/components/flow/project-context";
import { mapProjectToHeader } from "@/lib/flow/mappers/project-header";

export default function ProjectActivityPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const { project, isLoading, error } = useProject();

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center bg-neutral-50 text-neutral-500">Loading...</div>;
  }

  if (error || !project) {
    return <div className="flex h-screen items-center justify-center bg-neutral-50 text-neutral-500">{error || "Project not found."}</div>;
  }

  // Use shared mapper
  const projectForHeader = mapProjectToHeader(project);

  const breadcrumbLabel = `${project.project_number} - ${project.project_code} - ${project.project_name}`;

  return (
    <div className="min-h-screen bg-neutral-50 p-2 md:p-6">
      <Breadcrumb
        items={[
          { label: "Flow" },
          { label: "Projects", href: "/flow/projects" },
          { label: breadcrumbLabel, href: `/flow/projects/${projectId}` },
          { label: "Activity" },
        ]}
      />

      <PageWrapper sidebar={<ProjectDetailSidebar />}>
        <div className="space-y-6">
          <ProjectDetailHeader project={projectForHeader as any} />
          <ProjectDetailActivityContent />
        </div>
      </PageWrapper>
    </div>
  );
}
