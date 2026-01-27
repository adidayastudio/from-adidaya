"use client";

import PageWrapper from "@/components/layout/PageWrapper";
import MobileNavBar from "@/components/layout/MobileNavBar";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { FRAME_APPS } from "@/lib/navigation-config";
import { GraduationCap, BookOpen, FileText, Brain, Search } from "lucide-react";

// Learn Tabs (matching sidebar)
const LEARN_TABS = [
    { id: "browse", label: "Browse", href: "/frame/learn" },
    { id: "ai", label: "Ask AI", href: "/frame/learn?ai=true" },
    { id: "bookmarks", label: "Bookmarks", href: "/frame/learn?view=favorite" },
];

interface LearnPageWrapperProps {
    breadcrumbItems: { label: string; href?: string }[];
    header?: React.ReactNode;
    children: React.ReactNode;
    sidebar?: React.ReactNode;
}

export default function LearnPageWrapper({
    breadcrumbItems,
    header,
    children,
    sidebar,
}: LearnPageWrapperProps) {
    return (
        <>
            {/* MOBILE LAYOUT */}
            <div className="lg:hidden min-h-screen bg-neutral-100">
                <MobileNavBar
                    appName="Learn"
                    appIcon={GraduationCap}
                    parentHref="/frame"
                    parentLabel="Frame"
                    siblingApps={FRAME_APPS}
                    tabs={LEARN_TABS}
                    accentColor="text-orange-500"
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
