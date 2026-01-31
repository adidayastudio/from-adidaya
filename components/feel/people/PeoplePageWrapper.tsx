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
}

export default function PeoplePageWrapper({
    breadcrumbItems,
    header,
    children,
    sidebar,
    tabs = PEOPLE_TABS,
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
            </div>

            {/* DESKTOP LAYOUT */}
            <div className="hidden lg:block min-h-screen bg-neutral-50 p-6">
                <Breadcrumb items={breadcrumbItems} />
                <PageWrapper sidebar={sidebar} isTransparent>
                    <div className="space-y-8 w-full animate-in fade-in duration-500">
                        {header}
                        {children}
                    </div>
                </PageWrapper>
            </div>
        </>
    );
}
