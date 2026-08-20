"use client";

import React from "react";

interface WorkspaceModuleViewProps {
    selectedModule: string;
}

export default function WorkspaceModuleView({ selectedModule }: WorkspaceModuleViewProps) {
    return (
        <div className="flex-1 h-full overflow-y-auto p-6 space-y-6 max-w-5xl scrollbar-hide">
            <h2 className="text-[20px] font-bold capitalize text-neutral-900 dark:text-white">
                {selectedModule} Module Overview
            </h2>
            <div className="p-5 rounded-[22px] bg-white/40 dark:bg-neutral-900/40 backdrop-blur-2xl border border-white/60 dark:border-neutral-800/40">
                Operational summary for {selectedModule}.
            </div>
        </div>
    );
}
