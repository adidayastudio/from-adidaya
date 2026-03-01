"use client";

import PageWrapper from "@/components/layout/PageWrapper";
import { LiquidMobileHeader } from "@/components/shared/liquid/LiquidMobileHeader";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { FEEL_APPS } from "@/lib/navigation-config";
import { Heart, Users, UserCircle, Gift, Star } from "lucide-react";

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
    return (
        <>
            {/* MOBILE LAYOUT */}
            <div className="lg:hidden min-h-screen bg-neutral-100">
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
            <div className="hidden lg:block min-h-screen bg-neutral-50 p-6">
                <Breadcrumb items={breadcrumbItems} />
                <PageWrapper sidebar={sidebar} isTransparent>
                    <div className="space-y-8 w-full animate-in fade-in duration-500 pb-28 lg:pb-0">
                        {header}
                        {children}
                    </div>
                </PageWrapper>
            </div>
        </>
    );
}
