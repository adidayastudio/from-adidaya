"use client";

import { useState } from "react";
import clsx from "clsx";

interface Tab {
    id: string;
    label: string;
}

const TABS: Tab[] = [
    { id: "general", label: "General" },
    { id: "stage-wbs", label: "Stage–WBS Rules" },
    { id: "components", label: "Cost Components" },
    { id: "factors", label: "Factors & Adjustments" },
    { id: "validation", label: "Validation Rules" },
];

export default function CostSystemTabs({ activeTab, onTabChange }: { activeTab: string, onTabChange: (id: string) => void }) {
    return (
        <div className="border-b border-neutral-200 mb-6">
            <nav className="-mb-px flex space-x-6 overflow-x-auto hide-scrollbar">
                {TABS.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => onTabChange(tab.id)}
                        className={clsx(
                            "whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors",
                            activeTab === tab.id
                                ? "border-brand-red text-brand-red"
                                : "border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300"
                        )}
                    >
                        {tab.label}
                    </button>
                ))}
            </nav>
        </div>
    );
}
