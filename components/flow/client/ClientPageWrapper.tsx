"use client";

import PageWrapper from "@/components/layout/PageWrapper";
import MobileNavBar from "@/components/layout/MobileNavBar";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { FLOW_APPS } from "@/lib/navigation-config";
import { User, Users, FileSignature, MessageSquare, Receipt, LayoutDashboard } from "lucide-react";

// Client Tabs
const CLIENT_TABS = [
    { id: "overview", label: "Overview", href: "/flow/client" },
    { id: "directory", label: "Directory", href: "/flow/client/directory" },
    { id: "contracts", label: "Contracts", href: "/flow/client/contracts" },
    { id: "billing", label: "Billing", href: "/flow/client/billing" },
];

interface ClientPageWrapperProps {
    breadcrumbItems: { label: string; href?: string }[];
    header?: React.ReactNode;
    children: React.ReactNode;
    sidebar?: React.ReactNode;
}

export default function ClientPageWrapper({
    breadcrumbItems,
    header,
    children,
    sidebar,
}: ClientPageWrapperProps) {
    return (
        <>
            {/* MOBILE LAYOUT */}
            <div className="lg:hidden min-h-screen bg-neutral-100">
                <MobileNavBar
                    appName="Client"
                    appIcon={User}
                    parentHref="/flow"
                    parentLabel="Flow"
                    siblingApps={FLOW_APPS}
                    tabs={CLIENT_TABS}
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
