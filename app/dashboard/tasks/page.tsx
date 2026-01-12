"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import PageWrapper from "@/components/layout/PageWrapper";

import MyTasksSidebar, { MyTasksSection } from "@/components/my-tasks/MyTasksSidebar";
import MyTasksContent from "@/components/my-tasks/MyTasksContent";

function TasksPageContent() {
  const searchParams = useSearchParams();
  const initialSection = (searchParams.get("section") as MyTasksSection) || "today";
  const [section, setSection] = useState<MyTasksSection>(initialSection);

  // Map section to breadcrumb label
  const sectionLabels: Record<MyTasksSection, string> = {
    "today": "Today",
    "this-week": "This Week",
    "overdue": "Overdue",
    "all-tasks": "All Tasks",
    "completed": "Completed",
  };

  return (
    <div className="min-h-screen bg-neutral-50 p-6">
      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "My Tasks", href: "/dashboard/tasks" },
          { label: sectionLabels[section] }
        ]}
      />

      <PageWrapper sidebar={<MyTasksSidebar activeSection={section} onSectionChange={setSection} />}>
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
