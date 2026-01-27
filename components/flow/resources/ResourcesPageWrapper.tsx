"use client";

import PageWrapper from "@/components/layout/PageWrapper";
import MobileNavBar from "@/components/layout/MobileNavBar";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { FLOW_APPS } from "@/lib/navigation-config";
import { Package, LayoutDashboard, Boxes, Wrench, Archive } from "lucide-react";

// Resources Tabs
const RESOURCES_TABS = [
    { id: "overview", label: "Overview", href: "/flow/resources/overview" },
    { id: "materials", label: "Materials", href: "/flow/resources/materials" },
    { id: "tools", label: "Tools", href: "/flow/resources/tools" },
    { id: "assets", label: "Assets", href: "/flow/resources/assets" },
];

interface ResourcesPageWrapperProps {
    breadcrumbItems: { label: string; href?: string }[];
    header?: React.ReactNode;
    children: React.ReactNode;
    sidebar?: React.ReactNode;
}

export default function ResourcesPageWrapper({
    breadcrumbItems,
    header,
    children,
    sidebar,
}: ResourcesPageWrapperProps) {
    return (
        <>
            {/* MOBILE LAYOUT */}
            <div className="lg:hidden min-h-screen bg-neutral-100">
                <MobileNavBar
                    appName="Resources"
                    appIcon={Package}
                    parentHref="/flow"
                    parentLabel="Flow"
                    siblingApps={FLOW_APPS}
                    tabs={RESOURCES_TABS}
                    accentColor="text-red-500"
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
