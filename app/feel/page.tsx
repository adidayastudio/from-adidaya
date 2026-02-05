import FrostedGlassFilter from "@/components/layout/FrostedGlassFilter";
import FeelActivityRings from "@/components/feel/activity-rings/FeelActivityRings";
import FeelOverview from "@/components/feel/overview/FeelOverview";

export default function FeelRootPage() {
    return (
        <div className="h-screen overflow-y-auto overflow-x-hidden bg-blue-50/50 text-slate-900 pb-24 relative">
            <FrostedGlassFilter />

            {/* Header */}
            <header className="px-6 pt-12 pb-2 sticky top-0 z-10">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-slate-900">
                            Feel
                        </h1>
                        <p className="text-sm font-medium text-slate-500">
                            Daily Activity
                        </p>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="space-y-4 relative z-0">
                <FeelActivityRings />
                <FeelOverview />
            </main>
        </div>
    );
}
