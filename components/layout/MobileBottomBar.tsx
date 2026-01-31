"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import clsx from "clsx";
import {
    Home,
    Layers,
    Workflow,
    Heart,
    Play,
    Square,
    Plus,
    Upload,
    Download,
    FileText,
    Settings,
    Database,
    Package,
    Wrench,
    Briefcase
} from "lucide-react";
import { motion } from "framer-motion";
import { useClock } from "@/hooks/useClock";
import useUserProfile from "@/hooks/useUserProfile";
import ClockActionModal from "@/components/feel/clock/ClockActionModal";

const MOBILE_NAV_ITEMS = [
    { id: "home", label: "Home", icon: Home, href: "/dashboard" },
    { id: "frame", label: "Frame", icon: Layers, href: "/frame" },
    { id: "flow", label: "Flow", icon: Workflow, href: "/flow" },
    { id: "feel", label: "Feel", icon: Heart, href: "/feel" },
];

export default function MobileBottomBar() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { isCheckedIn, toggleClock } = useClock();
    const { profile } = useUserProfile();
    const [isClockModalOpen, setIsClockModalOpen] = React.useState(false);

    const isActive = (href: string) => {
        if (href === "/dashboard") return pathname === "/dashboard";
        return pathname.startsWith(href);
    };

    // Determine FAB context
    const getFabConfig = () => {
        const isDashboard = pathname === "/dashboard" || pathname === "/dashboard/overview";
        if (isDashboard) return { id: 'CLOCK', icon: (isCheckedIn ? Square : Play), color: (isCheckedIn ? 'red' : 'blue'), isClock: true };

        // Projects
        if (pathname === "/flow/projects/list") return { id: 'PROJECT_NEW', label: 'New Project', icon: Plus, color: 'red' };
        if (pathname === "/flow/projects/activity") return { id: 'PROJECT_LOG_ACTIVITY', label: 'Log Activity', icon: Plus, color: 'red' };
        if (pathname === "/flow/projects/docs") return { id: 'PROJECT_UPLOAD_DOC', label: 'Upload Doc', icon: Upload, color: 'red' };
        if (pathname === "/flow/projects/reports") return { id: 'PROJECT_EXPORT', label: 'Export', icon: Download, color: 'red' };
        if (pathname.includes("/flow/projects/overview") || pathname.includes("/flow/projects/schedule")) return null;
        if (pathname.startsWith("/flow/projects")) return { id: 'PROJECT_NEW', label: 'New Project', icon: Plus, color: 'red' };

        // Finance
        if (pathname === "/flow/finance" || pathname === "/flow/finance/overview") return { id: 'FINANCE_NEW_REQUEST', label: 'New Request', icon: Plus, color: 'red' };
        if (pathname === "/flow/finance/purchasing") return { id: 'FINANCE_NEW_PURCHASE', label: 'New Purchase', icon: Plus, color: 'red' };
        if (pathname === "/flow/finance/reimburse") return { id: 'FINANCE_NEW_PURCHASE', label: 'New Purchase', icon: Plus, color: 'red' }; // User said "reimburse: new purchase" but likely meant New Reimburse. Mapping to New Purchase per prompt.
        if (pathname === "/flow/finance/petty-cash") return { id: 'FINANCE_TOP_UP', label: 'Top Up', icon: Plus, color: 'red' };
        if (pathname === "/flow/finance/funding-sources") return { id: 'FINANCE_NEW_SOURCE', label: 'New Source', icon: Plus, color: 'red' };
        if (pathname === "/flow/finance/reports") return { id: 'FINANCE_EXPORT', label: 'Export', icon: Download, color: 'red' };

        // Resources
        if (pathname === "/flow/resources/overview") return { id: 'RESOURCE_NEW', label: 'New Mat/Tool/Asset', icon: Plus, color: 'red' };
        if (pathname === "/flow/resources/materials") return { id: 'RESOURCE_NEW_MAT', label: 'New Mat', icon: Plus, color: 'red' };
        if (pathname === "/flow/resources/tools") return { id: 'RESOURCE_NEW_TOOL', label: 'New Tool', icon: Plus, color: 'red' };
        if (pathname === "/flow/resources/assets") return { id: 'RESOURCE_NEW_ASSET', label: 'New Assets', icon: Plus, color: 'red' };

        // Client
        if (pathname.startsWith("/flow/client")) return { id: 'CLIENT_NEW', label: 'New', icon: Plus, color: 'red' };

        // Clock (Feel)
        if (pathname === "/feel/clock" || pathname.startsWith("/feel/clock")) {
            const section = searchParams.get("section") || "overview";

            if (section === "overview" || section === "timesheets") {
                return {
                    id: 'CLOCK',
                    icon: (isCheckedIn ? Square : Play),
                    color: (isCheckedIn ? 'red' : 'blue'),
                    isClock: true
                };
            }
            if (section === "leaves") return { id: 'CLOCK_NEW_LEAVE', label: 'New Request', icon: Plus, color: 'red' };
            if (section === "overtime") return { id: 'CLOCK_LOG_OVERTIME', label: 'Log Overtime', icon: Plus, color: 'red' };
            if (section === "business-trip") return { id: 'CLOCK_NEW_TRIP', label: 'New Trip', icon: Plus, color: 'red' };
        }

        // People Setup - Structure
        if (pathname === "/feel/people" && searchParams.get("section") === "setup" && searchParams.get("tab") === "structure") {
            return { id: 'STRUCTURE_ADD', label: 'Add', icon: Plus, color: 'blue' };
        }

        // People Setup - Employment (hide FAB on policies subtab)
        if (pathname === "/feel/people" && searchParams.get("section") === "setup" && searchParams.get("tab") === "employment") {
            const subtab = searchParams.get("subtab");
            // Hide FAB for policies tab (no add action)
            if (subtab === "policies") return null;
            return { id: 'EMPLOYMENT_ADD', label: 'Add', icon: Plus, color: 'blue' };
        }

        return null;
    };

    const fabConfig = getFabConfig();

    const handleFabClick = () => {
        if (!fabConfig) return;

        if (fabConfig.isClock) {
            setIsClockModalOpen(true);
        } else {
            // Dispatch custom event for page to handle
            const event = new CustomEvent('fab-action', { detail: { id: fabConfig.id } });
            window.dispatchEvent(event);
        }
    };

    return (
        <>
            <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 w-full px-4 max-w-sm">
                {/* iOS 26 GLASS NAV BAR */}
                <div
                    className="flex-1 backdrop-blur-3xl border border-white/40 shadow-2xl shadow-black/5 rounded-full px-2 py-1.5 flex justify-between items-center"
                    style={{ background: 'rgba(255, 255, 255, 0.45)' }}
                >
                    {MOBILE_NAV_ITEMS.map((item) => {
                        const active = isActive(item.href);
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.id}
                                href={item.href}
                                className={clsx(
                                    "relative flex flex-col items-center justify-center transition-all duration-200 rounded-full p-2.5 isolate",
                                    active
                                        ? "text-neutral-900"
                                        : "text-neutral-300 active:text-neutral-500"
                                )}
                            >
                                {active && (
                                    <motion.div
                                        layoutId="active-mobile-nav"
                                        className="absolute inset-0 rounded-full bg-neutral-300/40 backdrop-blur-xl border border-white/40 shadow-sm"
                                        transition={{
                                            type: "spring",
                                            stiffness: 200,
                                            damping: 22,
                                            mass: 1
                                        }}
                                    />
                                )}
                                <Icon
                                    className="w-5 h-5 transition-all relative z-10"
                                    strokeWidth={active ? 2.6 : 2}
                                />
                            </Link>
                        );
                    })}
                </div>

                {/* iOS 26 GLASS FAB */}
                {fabConfig && (
                    <button
                        onClick={handleFabClick}
                        className={clsx(
                            "w-14 h-14 flex items-center justify-center rounded-full shadow-xl transition-all active:scale-95 flex-shrink-0 text-white border border-white/20",
                            fabConfig.color === 'red' ? "shadow-red-500/30" : "shadow-blue-500/40"
                        )}
                        style={{
                            background: fabConfig.color === 'red'
                                ? 'linear-gradient(180deg, #EF4444 0%, #DC2626 100%)'
                                : 'linear-gradient(180deg, #3B82F6 0%, #2563EB 100%)'
                        }}
                    >
                        <fabConfig.icon className={clsx("w-5 h-5", fabConfig.id === 'CLOCK' && !isCheckedIn && "ml-0.5")} />
                    </button>
                )}
            </div>

            <ClockActionModal
                isOpen={isClockModalOpen}
                onClose={() => setIsClockModalOpen(false)}
                type={isCheckedIn ? "OUT" : "IN"}
                userRole={profile?.role || "staff"}
                onConfirm={toggleClock}
            />
        </>
    );
}
