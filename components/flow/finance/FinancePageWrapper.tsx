"use client";

import PageWrapper from "@/components/layout/PageWrapper";
import FinanceSidebar from "@/components/flow/finance/FinanceSidebar";
import FinanceMobileHeader from "@/components/flow/finance/FinanceMobileHeader";
import { FLOW_APPS, FINANCE_TABS, ALL_APPS } from "@/lib/navigation-config";
import { Banknote } from "lucide-react";

import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { usePathname } from "next/navigation";

export default function FinancePageWrapper({
    breadcrumbItems,
    header,
    children,
}: {
    breadcrumbItems: { label: string; href?: string }[];
    header?: React.ReactNode;
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    let fabId = "FINANCE_NEW_REQUEST";
    if (pathname.includes('/purchasing') || pathname.includes('/reimburse')) fabId = 'FINANCE_NEW_PURCHASE';
    else if (pathname.includes('/petty-cash')) fabId = 'FINANCE_TOP_UP';
    else if (pathname.includes('/funding-sources')) fabId = 'FINANCE_NEW_SOURCE';
    else if (pathname.includes('/reports')) fabId = 'FINANCE_EXPORT';

    return (
        <>
            {/* MOBILE LAYOUT */}
            <div className="lg:hidden min-h-screen bg-neutral-100">
                <FinanceMobileHeader fabId={fabId} backUrl="/dashboard" />

                {/* Content with top padding */}
                <div className="pb-32 px-5 space-y-4 mt-2">
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


