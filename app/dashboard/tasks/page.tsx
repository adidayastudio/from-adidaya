"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import PageWrapper from "@/components/layout/PageWrapper";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import MyTasksContent, { MyTasksSection } from "@/components/my-tasks/MyTasksContent";

function TasksPageContent() {
  const searchParams = useSearchParams();
  const section = (searchParams.get("section") as MyTasksSection) || "today";

  // Map section to breadcrumb label
  const sectionLabels: Record<string, string> = {
    "today": "Today",
    "this-week": "This Week",
    "overdue": "Overdue",
    "all-tasks": "All Tasks",
    "completed": "Completed",
  };

  return (
    <div className="min-h-screen bg-neutral-50 p-4 md:p-6 relative">
      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "My Tasks", href: "/dashboard/tasks" },
          { label: sectionLabels[section] || "Today" }
        ]}
      />

      <PageWrapper sidebar={<DashboardSidebar />}>
        <MyTasksContent section={section} />
      </PageWrapper>
    </div>
  );
}

export default function TasksPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-neutral-50 p-6 flex items-center justify-center">Loading...</div>}>
      <TasksPageContent />
    </Suspense>
  );
}
