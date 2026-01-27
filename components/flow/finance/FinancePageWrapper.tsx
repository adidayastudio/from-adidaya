"use client";

import PageWrapper from "@/components/layout/PageWrapper";
import FinanceSidebar from "@/components/flow/finance/FinanceSidebar";
import MobileNavBar from "@/components/layout/MobileNavBar";
import MobileViewToggle from "@/components/flow/finance/MobileViewToggle";
import { FLOW_APPS, FINANCE_TABS, ALL_APPS } from "@/lib/navigation-config";
import { Banknote } from "lucide-react";

import { Breadcrumb } from "@/shared/ui/headers/PageHeader";

export default function FinancePageWrapper({
    breadcrumbItems,
    header,
    children,
}: {
    breadcrumbItems: { label: string; href?: string }[];
    header?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <>
            {/* MOBILE LAYOUT */}
            <div className="lg:hidden min-h-screen bg-neutral-100">
                {/* Single-row liquid glass nav bar */}
                <MobileNavBar
                    appName="Finance"
                    appIcon={Banknote}
                    parentHref="/flow"
                    parentLabel="Flow"
                    siblingApps={FLOW_APPS}
                    tabs={FINANCE_TABS}
                    accentColor="text-red-500"
                />

                {/* Floating Personal/Team toggle */}
                <MobileViewToggle />

                {/* Content with top padding */}
                <div className="pb-32 px-4 pt-20 space-y-4">
                    {header}
                    {children}
                </div>
            </div>

            {/* DESKTOP LAYOUT */}
            <div className="hidden lg:block min-h-screen bg-neutral-50 p-6">
                <Breadcrumb items={breadcrumbItems} />
                <PageWrapper sidebar={<FinanceSidebar />} isTransparent>
                    <div className="space-y-8 w-full animate-in fade-in duration-500">
                        {header}
                        {children}
                    </div>
                </PageWrapper>
            </div>
        </>
    );
}


