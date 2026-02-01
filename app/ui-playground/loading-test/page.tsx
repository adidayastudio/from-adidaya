"use client";

import { useState } from "react";
import { GlobalLoading } from "@/components/shared/GlobalLoading";

export default function LoadingTestPage() {
    const [showLoader, setShowLoader] = useState(false);

    const triggerLoader = () => {
        setShowLoader(true);
        // Hide after 5 seconds to simulate finish
        setTimeout(() => setShowLoader(false), 5000);
    };

    return (
        <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-6 space-y-8">
            <div className="text-center space-y-4 max-w-md">
                <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">Loading Spinner Test</h1>
                <p className="text-neutral-500">
                    Test the delayed (1s) loading spinner with the "liquid fill" animation.
                </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
                <button
                    onClick={triggerLoader}
                    className="px-8 py-4 bg-neutral-900 text-white rounded-2xl font-bold shadow-lg active:scale-95 transition-all"
                >
                    Trigger Loader (5s)
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
                <div className="p-8 bg-white rounded-[32px] border border-neutral-200 shadow-sm space-y-4">
                    <h2 className="text-xl font-bold text-neutral-800">Desktop View</h2>
                    <p className="text-sm text-neutral-500">
                        The spinner should be centered and substantial in size.
                    </p>
                </div>
                <div className="p-8 bg-white rounded-[32px] border border-neutral-200 shadow-sm space-y-4">
                    <h2 className="text-xl font-bold text-neutral-800">Mobile View</h2>
                    <p className="text-sm text-neutral-500">
                        Check the scaling and centering on smaller viewports.
                    </p>
                </div>
            </div>

            {showLoader && <GlobalLoading />}
        </div>
    );
}
