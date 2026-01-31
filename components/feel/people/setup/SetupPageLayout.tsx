"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Button } from "@/shared/ui/primitives/button/button";
import { ArrowLeft } from "lucide-react";
import { clsx } from "clsx";

export interface SetupTab {
    id: string;
    label: string;
    description?: string;
    actionLabel?: string;
    icon?: React.ElementType;
    component: React.ComponentType<any>;
}

interface SetupPageLayoutProps {
    title: string;
    description: string;
    icon: React.ElementType;
    tabs: SetupTab[];
    onBack: () => void;
}

export default function SetupPageLayout({ title, description, icon: Icon, tabs, onBack }: SetupPageLayoutProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Get subtab from URL or default to first tab
    const subtabFromUrl = searchParams.get("subtab");
    const initialTab = subtabFromUrl && tabs.find(t => t.id === subtabFromUrl) ? subtabFromUrl : tabs[0].id;
    const [activeTabId, setActiveTabId] = useState(initialTab);

    const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];
    const ActiveComponent = activeTab.component;

    // Update URL when tab changes
    const handleTabChange = (tabId: string) => {
        setActiveTabId(tabId);
        const params = new URLSearchParams(searchParams.toString());
        params.set("subtab", tabId);
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    };

    // Sync from URL on mount if subtab param exists
    useEffect(() => {
        if (subtabFromUrl && tabs.find(t => t.id === subtabFromUrl)) {
            setActiveTabId(subtabFromUrl);
        }
    }, [subtabFromUrl, tabs]);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="secondary" onClick={onBack} icon={<ArrowLeft className="w-4 h-4" />}>
                    Back
                </Button>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-neutral-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-neutral-900">{title}</h1>
                        <p className="text-sm text-neutral-500">{description}</p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-neutral-200 overflow-x-auto">
                <div className="flex gap-1 min-w-max">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => handleTabChange(tab.id)}
                            className={clsx(
                                "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap",
                                activeTabId === tab.id
                                    ? "border-blue-600 text-blue-600"
                                    : "border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300"
                            )}
                        >
                            {tab.icon && <tab.icon className="w-4 h-4" />}
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content - extra bottom padding for mobile bottom bar */}
            <div className="min-h-[400px] pb-24 md:pb-0">
                <ActiveComponent />
            </div>
        </div>
    );
}
