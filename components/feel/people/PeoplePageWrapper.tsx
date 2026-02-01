"use client";

import PageWrapper from "@/components/layout/PageWrapper";
import MobileNavBar from "@/components/layout/MobileNavBar";
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
                <MobileNavBar
                    appName="People"
                    appIcon={Heart}
                    parentHref="/feel"
                    parentLabel="Feel"
                    siblingApps={FEEL_APPS}
                    tabs={tabs}
                    accentColor="text-blue-500"
                />

                <div className="pb-32 px-4 pt-20 space-y-4">
                    {header}
                    {children}
                </div>

                {/* Mobile FAB */}
                {fabAction && (
                    <div className="fixed bottom-6 right-4 z-50">
                        <button
                            onClick={fabAction.onClick}
                            className={`w-14 h-14 flex items-center justify-center rounded-full shadow-lg transition-transform active:scale-95 text-white ${fabAction.highlight ? "bg-red-500" : "bg-blue-600"}`}
                        >
                            {fabAction.icon}
                        </button>
                    </div>
                )}
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
