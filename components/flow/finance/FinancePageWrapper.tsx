"use client";

import PageWrapper from "@/components/layout/PageWrapper";
import FinanceSidebar from "@/components/flow/finance/FinanceSidebar";
import FinanceMobileHeader from "@/components/flow/finance/FinanceMobileHeader";
import { FLOW_APPS, FINANCE_TABS, ALL_APPS } from "@/lib/navigation-config";
import { Banknote, LayoutDashboard, ShoppingCart, Receipt, Wallet, Landmark, BarChart } from "lucide-react";
import Link from "next/link";
import clsx from "clsx";

import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { usePathname } from "next/navigation";

const INLINE_TABS = [
    { label: "Overview", path: "/flow/finance", icon: LayoutDashboard },
    { label: "Purchasing", path: "/flow/finance/purchasing", icon: ShoppingCart },
    { label: "Reimburse", path: "/flow/finance/reimburse", icon: Receipt },
    { label: "Petty Cash", path: "/flow/finance/petty-cash", icon: Wallet },
    { label: "Funding", path: "/flow/finance/funding-sources", icon: Landmark },
    { label: "Reports", path: "/flow/finance/reports", icon: BarChart },
];

function FinanceInlineTabs() {
    const pathname = usePathname();
    const isActive = (href: string) => {
        if (href === "/flow/finance") return pathname === "/flow/finance";
        return pathname.startsWith(href);
    };

    return (
        <div className="flex items-center gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {INLINE_TABS.map((tab) => {
                const active = isActive(tab.path);
                const Icon = tab.icon;
                return (
                    <Link
                        key={tab.path}
                        href={tab.path}
                        className={clsx(
                            "flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all flex-shrink-0 text-[14px]",
                            active
                                ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm border border-black/[0.04] dark:border-white/[0.05] font-bold"
                                : "bg-transparent text-neutral-500 dark:text-neutral-400 font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800"
                        )}
                    >
                        <Icon className={clsx("w-4 h-4", active ? "text-neutral-900 dark:text-white" : "text-neutral-500 dark:text-neutral-400 opacity-60")} strokeWidth={active ? 2 : 1.5} />
                        <span>{tab.label}</span>
                    </Link>
                );
            })}
        </div>
    );
}

export default function FinancePageWrapper({
    breadcrumbItems,
    header,
    children,
    rightToolbar,
}: {
    breadcrumbItems: { label: string; href?: string }[];
    header?: React.ReactNode;
    children: React.ReactNode;
    rightToolbar?: React.ReactNode;
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
            <div className="md:hidden min-h-screen bg-neutral-100 dark:bg-neutral-950 transition-colors">
                <FinanceMobileHeader fabId={fabId} backUrl="/dashboard" rightToolbar={rightToolbar} />

                {/* Content with top padding */}
                <div className="pb-32 px-5 space-y-4 mt-2">
                    {header}
                    {children}
                </div>
            </div>

            {/* DESKTOP LAYOUT */}
            <div className="hidden md:block bg-transparent p-0 transition-colors">
                <PageWrapper sidebar={<FinanceSidebar />} isTransparent>
                    {/* iPad inline tabs - visible on md, hidden on lg where sidebar shows */}
                    <div className="lg:hidden mb-4">
                        <h1 className="text-[28px] font-bold text-neutral-900 dark:text-white tracking-tight mb-3">Finance</h1>
                        <FinanceInlineTabs />
                    </div>
                    <div className="space-y-8 w-full animate-in fade-in duration-500">
                        {header}
                        {children}
                    </div>
                </PageWrapper>
            </div>
        </>
    );
}
