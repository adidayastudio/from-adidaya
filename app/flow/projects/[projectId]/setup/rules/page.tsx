"use client";

import { useParams } from "next/navigation";
import PageWrapper from "@/components/layout/PageWrapper";
import ProjectDetailSidebar from "@/components/flow/projects/project-detail/ProjectDetailSidebar";
import { GlobalLoading } from "@/components/shared/GlobalLoading";
import ProjectDetailHeader from "@/components/flow/projects/project-detail/ProjectDetailHeader";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { useProject } from "@/components/flow/project-context";
import { mapProjectToHeader } from "@/lib/flow/mappers/project-header";
import { ShieldAlert, ShieldCheck } from "lucide-react";

export default function ProjectSetupRulesPage() {
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

  const projectForHeader = mapProjectToHeader(project);
  const breadcrumbLabel = `${project.project_number} - ${project.project_code} - ${project.project_name}`;

  return (
    <PageWrapper sidebar={<ProjectDetailSidebar />} isTransparent={true}>
      <div className="space-y-6 w-full max-w-4xl mx-auto animate-in fade-in duration-500 px-4 md:px-0">
          <ProjectDetailHeader project={projectForHeader as any} />
          
          <div className="bg-white/40 dark:bg-neutral-800/10 backdrop-blur-md p-8 rounded-2xl border border-white/40 dark:border-white/5 shadow-sm flex flex-col items-center justify-center text-center py-16">
            <div className="w-16 h-16 rounded-full bg-brand-red/5 flex items-center justify-center text-brand-red mb-4">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-neutral-900 mb-2">Project Verification & Rules</h2>
            <p className="text-neutral-500 max-w-md mb-6">
              Configure system alerts, verification protocols, and stage transition gates for this project.
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100 text-neutral-600 text-xs font-medium">
              Module coming soon
            </div>
          </div>
        </div>
      </PageWrapper>
  );
}
