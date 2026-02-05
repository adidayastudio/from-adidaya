"use client";

import FeelActivityRings from "@/components/feel/activity-rings/FeelActivityRings";
import FeelOverview from "@/components/feel/overview/FeelOverview";

export default function FeelRootPage() {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-black pb-24">
            {/* Header / Top Bar Placeholder if needed, or just padding */}
            <div className="pt-6 px-6 pb-2">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Feel</h1>
                <p className="text-sm text-slate-500 font-medium">Daily Activity</p>
            </div>

            <FeelActivityRings />
            <FeelOverview />
        </div>
    );
}
