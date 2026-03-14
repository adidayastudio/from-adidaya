"use client";

import PageWrapper from "@/components/layout/PageWrapper";
import { LiquidMobileHeader } from "@/components/shared/liquid/LiquidMobileHeader";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { FEEL_APPS } from "@/lib/navigation-config";
import { Heart, Users, UserCircle, Gift, Star, Briefcase, BookOpen, Target, Sparkles, Settings as SettingsIcon, User } from "lucide-react";
import clsx from "clsx";
import useUserProfile from "@/hooks/useUserProfile";
import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

// People Tabs - only include existing pages
// People Tabs - matching the default view
const PEOPLE_TABS = [
    { id: "overview", label: "Overview", href: "/feel/people" },
    { id: "directory", label: "Directory", href: "/feel/people?section=directory" },
    { id: "performance", label: "Performance", href: "/feel/people?section=performance" },
];

interface PeoplePageWrapperProps {
    breadcrumbItems: { label: string; href?: string }[];
    header?: React.ReactNode;
    children: React.ReactNode;
    sidebar?: React.ReactNode;
    tabs?: { id: string; label: string; href: string }[];
    fabAction?: {
        icon: React.ReactNode;
        onClick: () => void;
        title: string;
        highlight?: boolean;
    };
}

export default function PeoplePageWrapper({
    breadcrumbItems,
    header,
    children,
    sidebar,
    tabs = PEOPLE_TABS,
    fabAction
}: PeoplePageWrapperProps) {
    const { profile } = useUserProfile();
    const isGlobalView = profile?.role === "admin" || profile?.role === "supervisor" || profile?.role === "hr" || profile?.role === "superadmin";
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const currentSection = searchParams.get("section") || "personal-profile";

    return (
        <>
            {/* MOBILE LAYOUT */}
            <div className="md:hidden min-h-screen bg-neutral-100">
                <LiquidMobileHeader
                    title="People"
                    backUrl="/dashboard"
                    tabs={tabs}
                    actions={
                        fabAction && (
                            <button
                                onClick={fabAction.onClick}
                                className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-neutral-50 active:bg-neutral-100 transition-colors text-neutral-700"
                            >
                                {fabAction.icon}
                            </button>
                        )
                    }
                />

                <div className="pb-32 px-5 space-y-4 mt-2">
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
                            {[
                                { id: "personal-profile", label: "Profile", icon: User },
                                { id: "personal-performance", label: "Performance", icon: Briefcase },
                                { id: "personal-growth", label: "Growth", icon: BookOpen },
                                { id: "personal-values", label: "Values", icon: Heart },
                                ...(isGlobalView ? [
                                    { id: "directory", label: "Directory", icon: Users },
                                    { id: "performance", label: "Index", icon: Target },
                                    { id: "team-culture", label: "Culture", icon: Sparkles },
                                    { id: "setup", label: "Setup", icon: SettingsIcon }
                                ] : [])
                            ].map((tab) => {
                                const isActive = currentSection === tab.id;
                                const Icon = tab.icon;
                                return (
                                    <Link
                                        key={tab.id}
                                        href={`${pathname}?section=${tab.id}`}
                                        className={clsx(
                                            "relative flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-colors flex-shrink-0",
                                            isActive
                                                ? "text-neutral-900 dark:text-white font-semibold"
                                                : "text-neutral-500 font-medium hover:text-neutral-700"
                                        )}
                                    >
                                        {isActive && (
                                            <motion.div
                                                layoutId="activeTabBadgePeople"
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
