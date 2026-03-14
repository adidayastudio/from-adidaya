"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import PageWrapper from "@/components/layout/PageWrapper";
import { GlobalLoading } from "@/components/shared/GlobalLoading";
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
    <div className="bg-transparent p-0 transition-colors">
      <PageWrapper
        sidebar={<DashboardSidebar />}
        isTransparent
        header={
          <div className="hidden lg:block mb-0">
            <div className="flex items-center justify-between gap-4 pt-0">
              <div>
                <h1 className="text-2xl font-bold text-neutral-900 dark:text-white tracking-tight">
                  My Tasks
                </h1>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                  Track your daily tasks, deadlines, and personal productivity.
                </p>
              </div>
            </div>
            <div className="border-b border-neutral-200 dark:border-neutral-800 mt-5" />
          </div>
        }
      >
        <div className="space-y-8 w-full animate-in fade-in duration-500">
          <MyTasksContent section={section} />
        </div>
      </PageWrapper>
    </div>
  );
}

export default function TasksPage() {
  return (
    <Suspense fallback={<GlobalLoading />}>
      <TasksPageContent />
    </Suspense>
  );
}
