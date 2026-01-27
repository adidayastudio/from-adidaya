"use client";

import PageWrapper from "@/components/layout/PageWrapper";
import MobileNavBar from "@/components/layout/MobileNavBar";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { FEEL_APPS } from "@/lib/navigation-config";
import { Calendar, CalendarDays, CalendarCheck, Users } from "lucide-react";

// Calendar Tabs - only include existing pages
const CALENDAR_TABS = [
    { id: "overview", label: "Overview", href: "/feel/calendar" },
];

interface CalendarPageWrapperProps {
    breadcrumbItems: { label: string; href?: string }[];
    header?: React.ReactNode;
    children: React.ReactNode;
    sidebar?: React.ReactNode;
}

export default function CalendarPageWrapper({
    breadcrumbItems,
    header,
    children,
    sidebar,
}: CalendarPageWrapperProps) {
    return (
        <>
            {/* MOBILE LAYOUT */}
            <div className="lg:hidden min-h-screen bg-neutral-100">
                <MobileNavBar
                    appName="Calendar"
                    appIcon={Calendar}
                    parentHref="/feel"
                    parentLabel="Feel"
                    siblingApps={FEEL_APPS}
                    tabs={CALENDAR_TABS}
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
