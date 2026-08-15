"use client";

import { useParams } from "next/navigation";
import StandardPageWrapper from "@/components/layout/StandardPageWrapper";
import ProjectDetailSidebar from "@/components/flow/projects/project-detail/ProjectDetailSidebar";
import { GlobalLoading } from "@/components/shared/GlobalLoading";
import ProjectDetailHeader from "@/components/flow/projects/project-detail/ProjectDetailHeader";
import ProjectTasksEditorContent from "@/components/flow/projects/project-detail/tasks/ProjectTasksEditorContent";
import { useProject } from "@/components/flow/project-context";
import { mapProjectToHeader } from "@/lib/flow/mappers/project-header";

export default function ProjectTasksPage() {
  const params = useParams();
  const projectId = (params?.projectId || params?.id) as string;
  const { project, isLoading, error } = useProject();

  if (isLoading) {
    return <GlobalLoading />;
  }

  if (error || !project) {
    return <div className="flex h-screen items-center justify-center bg-neutral-50 text-neutral-500">{error || "Project not found."}</div>;
  }

  const projectForHeader = mapProjectToHeader(project);
  const breadcrumbLabel = `${project.project_number} - ${project.project_code} - ${project.project_name}`;

  return (
    <StandardPageWrapper
      breadcrumbItems={[
        { label: "Flow" },
        { label: "Projects", href: "/flow/projects" },
        { label: breadcrumbLabel },
        { label: "Tasks & Deliverables" }
      ]}
      sidebar={<ProjectDetailSidebar />}
      isTransparent
    >
      <div className="space-y-8 max-w-4xl mx-auto px-4 md:px-0 animate-in fade-in duration-500">
        <ProjectDetailHeader project={projectForHeader as any} />
        <ProjectTasksEditorContent />
      </div>
    </StandardPageWrapper>
  );
}
