"use client";

import PageWrapper from "@/components/layout/PageWrapper";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import WebsiteMobileHeader from "./WebsiteMobileHeader";

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
    return (
        <>
            {/* MOBILE LAYOUT */}
            <div className="lg:hidden min-h-screen bg-neutral-100">
                <WebsiteMobileHeader onAdd={onAdd} />

                <div className="pb-32 px-4 space-y-4">
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
