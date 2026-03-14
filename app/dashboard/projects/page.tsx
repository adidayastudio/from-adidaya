"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Breadcrumb, PageHeader } from "@/shared/ui/headers/PageHeader";
import PageWrapper from "@/components/layout/PageWrapper";
import { GlobalLoading } from "@/components/shared/GlobalLoading";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import MyProjectsContent, { MyProjectsSection } from "@/components/dashboard/my-projects/MyProjectsContent";

function ProjectsPageContent() {
  const searchParams = useSearchParams();
  const section = (searchParams.get("section") as MyProjectsSection) || "all-projects";

  const labels: Record<string, string> = {
    "all-projects": "All Projects",
    "active": "Active",
    "attention": "Need Attention",
    "updates": "Updates",
    "completed": "Completed",
    "archived": "Archived"
  };

  return (
    <div className="bg-transparent p-0 transition-colors">
      <PageWrapper
        sidebar={<DashboardSidebar />}
        isTransparent
        header={
          <div className="hidden lg:block mb-0">
            <div className="flex items-center justify-between gap-4 pt-0">
              <div>
                <h1 className="text-2xl font-bold text-neutral-900 dark:text-white tracking-tight">
                  My Projects
                </h1>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                  Manage active projects, track progress, and view updates.
                </p>
              </div>
            </div>
            <div className="border-b border-neutral-200 dark:border-neutral-800 mt-5" />
          </div>
        }
      >
        <div className="space-y-8 w-full animate-in fade-in duration-500">
          <MyProjectsContent section={section} />
        </div>
      </PageWrapper>
    </div>
  );
}

export default function MyProjectsPage() {
  return (
    <Suspense fallback={<GlobalLoading />}>
      <ProjectsPageContent />
    </Suspense>
  );
}
