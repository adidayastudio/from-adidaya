"use client";

import { useParams } from "next/navigation";
import PageWrapper from "@/components/layout/PageWrapper";
import ProjectDetailSidebar from "@/components/flow/projects/project-detail/ProjectDetailSidebar";
import { GlobalLoading } from "@/components/shared/GlobalLoading";
import ProjectDetailHeader from "@/components/flow/projects/project-detail/ProjectDetailHeader";
import TrackingReportsTab from "@/components/flow/projects/project-detail/tracking/TrackingReportsTab";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { useProject } from "@/components/flow/project-context";
import { mapProjectToHeader } from "@/lib/flow/mappers/project-header";

export default function ProjectReportsPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const { project, isLoading, error } = useProject();

  if (isLoading) {
    return <GlobalLoading />;
  }

  if (error || !project) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-50 text-neutral-500">
        {error || "Project not found."}
      </div>
    );
  }

  // Use shared mapper
  const projectForHeader = mapProjectToHeader(project);
  const breadcrumbLabel = `${project.project_number} - ${project.project_code} - ${project.project_name}`;

  return (
    <PageWrapper sidebar={<ProjectDetailSidebar />} isTransparent={true}>
      <div className="space-y-6">
          <ProjectDetailHeader project={projectForHeader as any} />
          <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm">
            <TrackingReportsTab isActive={true} />
          </div>
        </div>
      </PageWrapper>
  );
}
