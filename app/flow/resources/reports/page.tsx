"use client";

import { FileBarChart } from "lucide-react";

export default function ResourcesReportsPage() {
    return (
        <div className="flex flex-col gap-6 animate-in fade-in duration-500">
            <div>
                <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Reports</h1>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Resource usage reports and analytics.</p>
            </div>

            <div className="py-20 text-center bg-white/50 dark:bg-neutral-900/50 border border-dashed border-neutral-200 dark:border-neutral-700 rounded-[32px]">
                <FileBarChart className="w-12 h-12 text-neutral-300 dark:text-neutral-600 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-neutral-500 dark:text-neutral-400">Coming Soon</h3>
                <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-1">Resource analytics and usage reports will be available here.</p>
            </div>
        </div>
    );
}
