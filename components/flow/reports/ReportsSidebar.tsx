"use client";

import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import {
    LayoutGrid,
    Calendar,
    CalendarCheck,
    FileText
} from "lucide-react";

/* ======================
   NAV ITEMS CONFIG
   (Reports Module)
 ====================== */
const NAV_ITEMS = [
    { label: "Overview", path: "/flow/reports/overview", icon: LayoutGrid },
    { label: "Daily Reports", path: "/flow/reports/daily", icon: Calendar },
    { label: "Weekly Reports", path: "/flow/reports/weekly", icon: FileText },
    { label: "Monthly Reports", path: "/flow/reports/monthly", icon: CalendarCheck },
];

export default function ReportsSidebar() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const typeParam = searchParams.get("type");

    const isActive = (path: string) => {
        if (pathname === "/flow/reports/editor") {
            if (path === "/flow/reports/daily") return typeParam === "daily";
            if (path === "/flow/reports/weekly") return typeParam === "weekly";
            if (path === "/flow/reports/monthly") return typeParam === "monthly";
            return false;
        }

        if (path === "/flow/reports/overview") {
            return pathname === "/flow/reports/overview" || pathname === "/flow/reports";
        }
        return pathname.startsWith(path);
    };

    const mobileMainItems = NAV_ITEMS;

    return (
        <>
            {/* DESKTOP SIDEBAR */}
            <aside className="w-full hidden lg:flex flex-col">
                <div className="space-y-0 pt-0">
                    <div className="space-y-0.5">
                        {NAV_ITEMS.map((item) => {
                            const active = isActive(item.path);
                            return (
                                <Link
                                    key={item.path}
                                    href={item.path}
                                    className={clsx(
                                        "w-full text-left rounded-lg text-[12px] transition-all flex items-center gap-2.5 px-3 py-1.5",
                                        active
                                            ? "text-neutral-900 dark:text-white bg-neutral-500/10 dark:bg-neutral-400/20 font-semibold shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]"
                                            : "text-neutral-500 hover:bg-white/40 dark:hover:bg-neutral-800/40 hover:text-neutral-800 dark:hover:text-neutral-200 font-medium"
                                    )}
                                >
                                    <item.icon className={clsx("w-4 h-4 shrink-0 transition-colors", active ? "text-neutral-900 dark:text-white" : "text-neutral-400")} />
                                    <span className="truncate">{item.label}</span>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </aside>

            {/* MOBILE BOTTOM NAVIGATION */}
            <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center justify-center gap-3 w-full px-4 max-w-sm safe-area-bottom">
                <div className="bg-white/50 backdrop-blur-sm backdrop-saturate-150 shadow-sm rounded-full px-4 py-1.5 flex items-center justify-center gap-4 border border-white/30 dark:border-neutral-800/30">
                    {mobileMainItems.map((item) => {
                        const active = isActive(item.path);
                        return (
                            <Link
                                key={item.path}
                                href={item.path}
                                className={clsx(
                                    "flex items-center justify-center transition-all duration-200 rounded-full p-2.5",
                                    active ? "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400" : "text-neutral-400"
                                )}
                            >
                                <item.icon
                                    className={clsx(
                                        "w-5 h-5 transition-colors",
                                        active && "stroke-2"
                                    )}
                                />
                            </Link>
                        );
                    })}
                </div>
            </div>
        </>
    );
}
