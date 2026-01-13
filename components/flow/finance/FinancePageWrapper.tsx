"use client";

import PageWrapper from "@/components/layout/PageWrapper";
import FinanceSidebar from "@/components/flow/finance/FinanceSidebar";

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
        <div className="min-h-screen bg-neutral-50 p-6">
            <Breadcrumb items={breadcrumbItems} />
            <PageWrapper sidebar={<FinanceSidebar />}>
                <div className="space-y-8 w-full animate-in fade-in duration-500">
                    {header}
                    {children}
                </div>
            </PageWrapper>
        </div>
    );
}
