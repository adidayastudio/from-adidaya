"use client";

import PageWrapper from "@/components/layout/PageWrapper";
import MobileNavBar from "@/components/layout/MobileNavBar";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { FRAME_APPS } from "@/lib/navigation-config";
import { Globe, Layout, Palette, FileText, Settings } from "lucide-react";

// Website Tabs (matching sidebar sections)
const WEBSITE_TABS = [
    { id: "dashboard", label: "Overview", href: "/frame/website" },
    { id: "landing", label: "Landing", href: "/frame/website?view=hero-image" },
    { id: "studio", label: "Studio", href: "/frame/website?view=studio-profile" },
    { id: "projects", label: "Projects", href: "/frame/website?view=projects" },
    { id: "insights", label: "Insight", href: "/frame/website?view=insights" },
    { id: "network", label: "Network", href: "/frame/website?view=network-contact" },
];

interface WebsitePageWrapperProps {
    breadcrumbItems: { label: string; href?: string }[];
    header?: React.ReactNode;
    children: React.ReactNode;
    sidebar?: React.ReactNode;
}

export default function WebsitePageWrapper({
    breadcrumbItems,
    header,
    children,
    sidebar,
}: WebsitePageWrapperProps) {
    return (
        <>
            {/* MOBILE LAYOUT */}
            <div className="lg:hidden min-h-screen bg-neutral-100">
                <MobileNavBar
                    appName="Website"
                    appIcon={Globe}
                    parentHref="/frame"
                    parentLabel="Frame"
                    siblingApps={FRAME_APPS}
                    tabs={WEBSITE_TABS}
                    accentColor="text-orange-500"
                />

                <div className="pb-32 px-4 pt-20 space-y-4">
                    {header}
                    {children}
                </div>
            </div>

            {/* DESKTOP LAYOUT */}
            <div className="hidden lg:block min-h-screen bg-neutral-50 p-6">
                <Breadcrumb items={breadcrumbItems} />
                <PageWrapper sidebar={sidebar}>
                    <div className="space-y-8 w-full animate-in fade-in duration-500">
                        {header}
                        {children}
                    </div>
                </PageWrapper>
            </div>
        </>
    );
}
