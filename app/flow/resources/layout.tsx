"use client";

import PageWrapper from "@/components/layout/PageWrapper";
import ResourcesSidebar from "@/components/flow/resources/ResourcesSidebar";
import ResourcesMobileHeader from "@/components/flow/resources/ResourcesMobileHeader";
import Link from "next/link";
import clsx from "clsx";
import { usePathname } from "next/navigation";
import { LayoutGrid, Package, Wrench, Building2, Handshake, History } from "lucide-react";

const INLINE_TABS = [
    { label: "Overview", path: "/flow/resources/overview", icon: LayoutGrid },
    { label: "Materials", path: "/flow/resources/materials", icon: Package },
    { label: "Tools", path: "/flow/resources/tools", icon: Wrench },
    { label: "Assets", path: "/flow/resources/assets", icon: Building2 },
    { label: "Services", path: "/flow/resources/services", icon: Handshake },
    { label: "Activity", path: "/flow/resources/activity-log", icon: History },
];

function ResourcesInlineTabs() {
    const pathname = usePathname();
    const isActive = (href: string) => {
        if (href === "/flow/resources/overview") return pathname === "/flow/resources/overview" || pathname === "/flow/resources";
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

export default function ResourcesLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            {/* MOBILE LAYOUT */}
            <div className="md:hidden min-h-screen bg-neutral-100 dark:bg-neutral-950 transition-colors">
                <ResourcesMobileHeader backUrl="/dashboard" />

                {/* Content with top padding */}
                <div className="pb-32 px-5 space-y-4 mt-2">
                    {children}
                </div>
            </div>

            {/* DESKTOP LAYOUT */}
            <div className="hidden md:block bg-transparent p-0 transition-colors">
                <PageWrapper sidebar={<ResourcesSidebar />} isTransparent>
                    {/* iPad inline tabs - visible on md, hidden on lg where sidebar shows */}
                    <div className="lg:hidden mb-4">
                        <h1 className="text-[28px] font-bold text-neutral-900 dark:text-white tracking-tight mb-3">Resources</h1>
                        <ResourcesInlineTabs />
                    </div>
                    <div className="space-y-8 w-full animate-in fade-in duration-500">
                        {children}
                    </div>
                </PageWrapper>
            </div>
        </>
    );
}
