"use client";

import PageWrapper from "@/components/layout/PageWrapper";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import WebsiteMobileHeader from "./WebsiteMobileHeader";
import { motion } from "framer-motion";
import clsx from "clsx";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { LayoutDashboard, Image, Building2, FolderKanban, Lightbulb, Phone, Users } from "lucide-react";
import { WebsiteView } from "./WebsiteView";

interface WebsitePageWrapperProps {
    breadcrumbItems: { label: string; href?: string }[];
    header?: React.ReactNode;
    children: React.ReactNode;
    sidebar?: React.ReactNode;
    onAdd?: () => void;
}

export default function WebsitePageWrapper({
    breadcrumbItems,
    header,
    children,
    sidebar,
    onAdd,
}: WebsitePageWrapperProps) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const activeView = (searchParams.get("view") as WebsiteView) || "dashboard";

    const WEBSITE_TABS = [
        { id: "dashboard", label: "Home", icon: LayoutDashboard, href: `${pathname}?view=dashboard` },
        { id: "hero-image", label: "Land", icon: Image, href: `${pathname}?view=hero-image` },
        { id: "studio-profile", label: "Studio", icon: Building2, href: `${pathname}?view=studio-profile` },
        { id: "projects", label: "Projs", icon: FolderKanban, href: `${pathname}?view=projects` },
        { id: "insights", label: "Insights", icon: Lightbulb, href: `${pathname}?view=insights` },
        { id: "network-contact", label: "Net", icon: Users, href: `${pathname}?view=network-contact` },
    ];

    return (
        <>
            {/* MOBILE LAYOUT */}
            <div className="md:hidden min-h-screen bg-neutral-100">
                <WebsiteMobileHeader onAdd={onAdd} />

                <div className="pb-32 px-4 space-y-4">
                    {header}
                    {children}
                </div>
            </div>

            {/* DESKTOP LAYOUT */}
            <div className="hidden md:block bg-transparent p-0 transition-colors">
                <PageWrapper sidebar={sidebar} isTransparent>
                    <div className="space-y-8 w-full animate-in fade-in duration-500">
                        {/* Inline Tabs for iPad (Hidden on Desktop) */}
                        <div className="lg:hidden flex items-center gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] -mx-4 px-4 mb-2">
                            {WEBSITE_TABS.map((tab) => {
                                const isActive = activeView === tab.id || 
                                               (tab.id === 'hero-image' && activeView === 'landing-description') ||
                                               (tab.id === 'studio-profile' && activeView.startsWith('studio')) ||
                                               (tab.id === 'network-contact' && activeView.startsWith('network'));
                                const Icon = tab.icon;
                                return (
                                    <Link
                                        key={tab.id}
                                        href={tab.href}
                                        className={clsx(
                                            "relative flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-colors flex-shrink-0",
                                            isActive
                                                ? "text-neutral-900 dark:text-white font-semibold"
                                                : "text-neutral-500 font-medium hover:text-neutral-700"
                                        )}
                                    >
                                        {isActive && (
                                            <motion.div
                                                layoutId="activeTabBadgeWebsite"
                                                className="absolute inset-0 rounded-full bg-white dark:bg-neutral-800 shadow-sm border border-black/[0.04] dark:border-white/[0.04]"
                                                transition={{ type: "spring", stiffness: 500, damping: 35 }}
                                            />
                                        )}
                                        <div className="relative z-10 flex items-center gap-2">
                                            <Icon size={16} strokeWidth={isActive ? 2.5 : 2} className={isActive ? "text-neutral-900 dark:text-white" : "opacity-60"} />
                                            <span className="text-[13px]">{tab.label}</span>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                        {header}
                        {children}
                    </div>
                </PageWrapper>
            </div>
        </>
    );
}
