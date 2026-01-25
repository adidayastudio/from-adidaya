"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import PageWrapper from "@/components/layout/PageWrapper";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import NotificationsContent, { NotificationSection } from "@/components/dashboard/notifications/NotificationsContent";

function NotificationsPageContent() {
  const searchParams = useSearchParams();
  const section = (searchParams.get("section") as NotificationSection) || "all";

  const labels: Record<string, string> = {
    "all": "All",
    "unread": "Unread",
    "approvals": "Approvals",
    "mentions": "Mentions",
    "system": "System"
  };

  return (
    <div className="min-h-screen bg-neutral-50 p-4 md:p-6 relative">
      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Notifications", href: "/dashboard/notifications" },
          { label: labels[section] || "All" }
        ]}
      />

      <PageWrapper sidebar={<DashboardSidebar />}>
        <NotificationsContent section={section} />
      </PageWrapper>
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-neutral-50 p-6 flex items-center justify-center">Loading...</div>}>
      <NotificationsPageContent />
    </Suspense>
  );
}
