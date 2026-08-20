"use client";

import React, { Suspense } from "react";
import FinanceOverviewClient from "@/components/flow/finance/FinanceOverviewClient";
import { FinanceProvider } from "@/components/flow/finance/FinanceContext";
import ResourcesOverviewPage from "@/app/flow/resources/overview/page";
import FeelPeoplePage from "@/app/feel/people/page";
import ClockPage from "@/app/feel/clock/page";
import { GlobalLoading } from "@/components/shared/GlobalLoading";

interface WorkspaceModuleViewProps {
    selectedModule: string;
}

export default function WorkspaceModuleView({ selectedModule }: WorkspaceModuleViewProps) {
    return (
        <div className="flex-1 h-full overflow-y-auto scrollbar-hide p-4 sm:p-6 stream-workspace-ipad">
            <style>{`
                .stream-workspace-ipad aside { display: none !important; }
                .stream-workspace-ipad .lg\\:hidden { display: block !important; }
            `}</style>
            <Suspense fallback={<GlobalLoading />}>
                {selectedModule === "finance" && (
                    <FinanceProvider>
                        <FinanceOverviewClient />
                    </FinanceProvider>
                )}
                {selectedModule === "resources" && (
                    <ResourcesOverviewPage />
                )}
                {selectedModule === "people" && (
                    <FeelPeoplePage />
                )}
                {selectedModule === "clock" && (
                    <ClockPage />
                )}
                {!["finance", "resources", "people", "clock"].includes(selectedModule) && (
                    <div className="space-y-6 max-w-5xl">
                        <h2 className="text-[20px] font-bold capitalize text-neutral-900 dark:text-white">
                            {selectedModule} Module Overview
                        </h2>
                        <div className="p-5 rounded-[22px] bg-white/40 dark:bg-neutral-900/40 backdrop-blur-2xl border border-white/60 dark:border-neutral-800/40">
                            Operational summary for {selectedModule}.
                        </div>
                    </div>
                )}
            </Suspense>
        </div>
    );
}
