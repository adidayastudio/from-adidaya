"use client";

import { usePathname } from "next/navigation";
import PageWrapper from "@/components/layout/PageWrapper";
import NotificationsSidebar from "@/components/dashboard/notifications/NotificationsSidebar";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";

export default function NotificationsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const section = pathname.split("/").pop(); // "notifications" (if root), "unread", "mentions", "approvals", "system"

    const isRoot = pathname === "/dashboard/notifications";

    // Capitalize first letter logic
    const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

    const breadcrumbs: { label: string; href?: string }[] = [
        { label: "Dashboard", href: "/dashboard" },
        { label: "Notifications", href: isRoot ? undefined : "/dashboard/notifications" },
    ];

    if (!isRoot && section) {
        breadcrumbs.push({ label: capitalize(section) });
    }

    return (
        <div className="min-h-screen bg-neutral-50 p-6">
            <Breadcrumb items={breadcrumbs} />
            <PageWrapper sidebar={<NotificationsSidebar />}>
                {children}
            </PageWrapper>
        </div>
    );
}
