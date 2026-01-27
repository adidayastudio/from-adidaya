"use client";

import PageWrapper from "@/components/layout/PageWrapper";
import MobileNavBar from "@/components/layout/MobileNavBar";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { FEEL_APPS } from "@/lib/navigation-config";
import { Sparkles, Trophy, PartyPopper, MessageCircle } from "lucide-react";

// Culture Tabs - only include existing pages
const CULTURE_TABS = [
    { id: "overview", label: "Overview", href: "/feel/culture" },
];

interface CulturePageWrapperProps {
    breadcrumbItems: { label: string; href?: string }[];
    header?: React.ReactNode;
    children: React.ReactNode;
    sidebar?: React.ReactNode;
}

export default function CulturePageWrapper({
    breadcrumbItems,
    header,
    children,
    sidebar,
}: CulturePageWrapperProps) {
    return (
        <>
            {/* MOBILE LAYOUT */}
            <div className="lg:hidden min-h-screen bg-neutral-100">
                <MobileNavBar
                    appName="Culture"
                    appIcon={Sparkles}
                    parentHref="/feel"
                    parentLabel="Feel"
                    siblingApps={FEEL_APPS}
                    tabs={CULTURE_TABS}
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
