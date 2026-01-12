"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { ArrowLeft, Coins } from "lucide-react";
import PageWrapper from "@/components/layout/PageWrapper";
import ProjectsSidebar from "@/components/flow/projects/ProjectsSidebar";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { Button } from "@/shared/ui/primitives/button/button";

export default function PriceLibraryLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();

    const tabs = [
        { name: "Ballpark", href: "/flow/projects/settings/price-library/ballpark" },
        { name: "Estimates", href: "/flow/projects/settings/price-library/estimates" },
        { name: "Detail Cost", href: "/flow/projects/settings/price-library/detail" },
        { name: "AHSP", href: "/flow/projects/settings/price-library/ahsp" },
        { name: "Resources", href: "/flow/projects/settings/price-library/resources" },
        { name: "Factors", href: "/flow/projects/settings/price-library/factors" },
        { name: "BOQ", href: "/flow/projects/settings/price-library/boq" },
    ];

    return (
        <div className="min-h-screen bg-neutral-50 p-6">
            <Breadcrumb items={[
                { label: "Flow" },
                { label: "Projects" },
                { label: "Settings", href: "/flow/projects/settings" },
                { label: "Price Library" }
            ]} />

            <PageWrapper sidebar={<ProjectsSidebar />}>
                <div className="space-y-6 w-full animate-in fade-in duration-500">
                    {/* Header */}
                    <div className="flex items-center gap-4">
                        <Link href="/flow/projects/settings">
                            <Button variant="secondary" icon={<ArrowLeft className="w-4 h-4" />}>
                                Back
                            </Button>
                        </Link>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center">
                                <Coins className="w-5 h-5 text-brand-red" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-neutral-900">Price Library</h1>
                                <p className="text-sm text-neutral-500">Manage unit prices and cost data. NO structural rules.</p>
                            </div>
                        </div>
                    </div>

                    {/* Navigation */}
                    <div className="border-b border-neutral-200">
                        <nav className="-mb-px flex space-x-6">
                            {tabs.map((tab) => {
                                const isActive = pathname === tab.href;
                                return (
                                    <Link
                                        key={tab.name}
                                        href={tab.href}
                                        className={clsx(
                                            "whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors",
                                            isActive
                                                ? "border-brand-red text-brand-red"
                                                : "border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300"
                                        )}
                                    >
                                        {tab.name}
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>

                    {children}
                </div>
            </PageWrapper>
        </div>
    );
}
