"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Breadcrumb, PageHeader } from "@/shared/ui/headers/PageHeader";
import PageWrapper from "@/components/layout/PageWrapper";
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

  const header = (
    <PageHeader
      title="My Projects"
      description="Manage active projects, track progress, and view updates."
    />
  );

  return (
    <div className="min-h-screen bg-neutral-50 p-4 md:p-6 relative">
      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "My Projects", href: "/dashboard/projects" },
          { label: labels[section] || "All Projects" }
        ]}
      />

      <PageWrapper sidebar={<DashboardSidebar />} header={header}>
        <MyProjectsContent section={section} />
      </PageWrapper>
    </div>
  );
}

export default function MyProjectsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-neutral-50 p-6 flex items-center justify-center">Loading...</div>}>
      <ProjectsPageContent />
    </Suspense>
  );
}
