"use client";

import React from "react";
import FrostedGlassFilter from "@/components/layout/FrostedGlassFilter";
import FlowActivityRings from "@/components/flow/activity-rings/FlowActivityRings";
import FlowOverview from "@/components/flow/overview/FlowOverview";

export default function FlowRootPage() {
    return (
        <div className="h-screen overflow-y-auto overflow-x-hidden bg-slate-50 text-slate-900 pb-24 relative">
            <FrostedGlassFilter />

            {/* Header */}
            <header className="px-6 pt-12 pb-2 sticky top-0 z-10">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                            Flow
                        </h1>
                        <p className="text-sm font-medium text-slate-500">
                            Work Execution
                        </p>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="space-y-4 relative z-0">
                {/* 1. Activity Rings Section */}
                <FlowActivityRings />

                {/* 2. Overview Grid Section */}
                <FlowOverview />
            </main>
        </div>
    );
}
