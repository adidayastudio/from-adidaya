"use client";

import React from "react";
import PageWrapper from "@/components/layout/PageWrapper";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";

interface StandardPageWrapperProps {
  breadcrumbItems: { label: string; href?: string }[];
  sidebar?: React.ReactNode | null;
  header?: React.ReactNode;
  children: React.ReactNode;
  isTransparent?: boolean;
  fullWidth?: boolean;
}

export default function StandardPageWrapper({
  breadcrumbItems,
  sidebar = <DashboardSidebar />,
  header,
  children,
  isTransparent = false,
  fullWidth = false,
}: StandardPageWrapperProps) {
  return (
    <div className="animate-in fade-in duration-500">
      <PageWrapper sidebar={sidebar === null ? undefined : sidebar} isTransparent={isTransparent} fullWidth={fullWidth}>
        <div className="space-y-4 w-full">
          {header}
          {children}
        </div>
      </PageWrapper>
    </div>
  );
}
