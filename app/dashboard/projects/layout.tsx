"use client";

import { usePathname } from "next/navigation";
import PageWrapper from "@/components/layout/PageWrapper";
import MyProjectsSidebar from "@/components/dashboard/my-projects/MyProjectsSidebar";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";

export default function MyProjectsLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const segment = pathname.split("/").pop(); // overview, active, etc.

    // Map segment to label
    const labels: Record<string, string> = {
        "overview": "Overview",
        "active": "Active Projects",
        "attention": "Need Attention",
        "updates": "Updates",
        "archived": "Archived"
    };

    const currentLabel = labels[segment || ""] || "Overview";

    return (
        <div className="min-h-screen bg-neutral-50 p-6">
            <Breadcrumb
                items={[
                    { label: "Dashboard", href: "/dashboard" },
                    { label: "My Projects", href: "/dashboard/projects" },
                    { label: currentLabel }
                ]}
            />
            <PageWrapper sidebar={<MyProjectsSidebar />}>
                {children}
            </PageWrapper>
        </div>
    );
}
