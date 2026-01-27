"use client";

import PageWrapper from "@/components/layout/PageWrapper";
import MobileNavBar from "@/components/layout/MobileNavBar";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { FRAME_APPS } from "@/lib/navigation-config";
import { Share2, MessageCircle, Users, Camera, Heart } from "lucide-react";

// Social Tabs (matching sidebar)
const SOCIAL_TABS = [
    { id: "overview", label: "Overview", href: "/frame/social" },
    { id: "accounts", label: "Account", href: "/frame/social?section=accounts" },
];

interface SocialPageWrapperProps {
    breadcrumbItems: { label: string; href?: string }[];
    header?: React.ReactNode;
    children: React.ReactNode;
    sidebar?: React.ReactNode;
}

export default function SocialPageWrapper({
    breadcrumbItems,
    header,
    children,
    sidebar,
}: SocialPageWrapperProps) {
    return (
        <>
            {/* MOBILE LAYOUT */}
            <div className="lg:hidden min-h-screen bg-neutral-100">
                <MobileNavBar
                    appName="Social"
                    appIcon={Share2}
                    parentHref="/frame"
                    parentLabel="Frame"
                    siblingApps={FRAME_APPS}
                    tabs={SOCIAL_TABS}
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
