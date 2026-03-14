"use client";

import PageWrapper from "@/components/layout/PageWrapper";
import LearnMobileHeader from "@/components/frame/learn/LearnMobileHeader";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { FRAME_APPS } from "@/lib/navigation-config";
import { GraduationCap, LayoutDashboard, Heart, FileText, Folder, BookOpen } from "lucide-react";
import { motion } from "framer-motion";
import clsx from "clsx";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { QuickView } from "./types";

interface LearnPageWrapperProps {
    breadcrumbItems: { label: string; href?: string }[];
    header?: React.ReactNode;
    children: React.ReactNode;
    sidebar?: React.ReactNode;
    onAddKnowledge?: () => void;
    // Mobile Filter Props
    view?: "list" | "grouped";
    onChangeView?: (v: "list" | "grouped") => void;
    selectedDepartment?: string[];
    onDepartmentChange?: (dept: any) => void;
    selectedType?: string[];
    onTypeChange?: (type: any) => void;
    typeOptions?: { value: string; label: string }[];
    selectedSort?: string;
    onSortChange?: (sort: any) => void;
    onAddKnowledgeSuccess?: (data: any) => void;
}

export default function LearnPageWrapper({
    breadcrumbItems,
    header,
    children,
    sidebar,
    onAddKnowledge,
    view,
    onChangeView,
    selectedDepartment,
    onDepartmentChange,
    selectedType,
    onTypeChange,
    typeOptions,
    selectedSort,
    onSortChange,
    onAddKnowledgeSuccess,
}: LearnPageWrapperProps) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    
    // Logic to determine active view based on params (same as in page.tsx)
    const category = searchParams.get("category");
    const viewParam = searchParams.get("view");
    let activeQuickView: QuickView = "all";
    if (viewParam === "favorite") activeQuickView = "favorite";
    else if (category === "documentation") activeQuickView = "documentation";
    else if (category === "templates") activeQuickView = "templates";
    else if (category === "references") activeQuickView = "references";

    const LEARN_TABS = [
        { id: "all", label: "All", icon: LayoutDashboard, href: pathname },
        { id: "favorite", label: "Favorite", icon: Heart, href: `${pathname}?view=favorite` },
        { id: "documentation", label: "Docs", icon: FileText, href: `${pathname}?category=documentation` },
        { id: "templates", label: "Templates", icon: Folder, href: `${pathname}?category=templates` },
        { id: "references", label: "References", icon: BookOpen, href: `${pathname}?category=references` },
    ];

    return (
        <>
            {/* MOBILE LAYOUT */}
            <div className="md:hidden min-h-screen bg-neutral-100">
                <LearnMobileHeader
                    onAddKnowledge={onAddKnowledge}
                    backUrl="/dashboard"
                    view={view}
                    onChangeView={onChangeView}
                    selectedDepartment={selectedDepartment}
                    onDepartmentChange={onDepartmentChange}
                    selectedType={selectedType}
                    onTypeChange={onTypeChange}
                    typeOptions={typeOptions}
                    selectedSort={selectedSort}
                    onSortChange={onSortChange}
                    onAddKnowledgeSuccess={onAddKnowledgeSuccess}
                />

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
                            {LEARN_TABS.map((tab) => {
                                const isActive = activeQuickView === tab.id;
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
                                                layoutId="activeTabBadgeLearn"
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
