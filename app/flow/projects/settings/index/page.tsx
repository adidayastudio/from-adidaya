"use client";

import React from "react";
import PageWrapper from "@/components/layout/PageWrapper";
import ProjectsSidebar from "@/components/flow/projects/ProjectsSidebar";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import ProjectIndexView from "@/components/flow/projects/project-detail/setup/index/ProjectIndexView";

export default function SettingsIndexPage() {
  return (
    <div className="min-h-screen bg-transparent px-5 md:px-0 py-6 md:py-0">
      <Breadcrumb
        items={[
          { label: "Flow" },
          { label: "Projects" },
          { label: "Settings", href: "/project/settings" },
          { label: "Index" }
        ]}
      />
      <PageWrapper sidebar={<ProjectsSidebar />}>
        <ProjectIndexView />
      </PageWrapper>
    </div>
  );
}
