"use client";

import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import {
    LayoutGrid,
    Calendar,
    CalendarCheck,
    FileText,
    TrendingUp,
    DollarSign,
    Users,
    Package,
    ShieldCheck,
    HardHat,
    AlertOctagon,
    FileSpreadsheet,
    FileDiff,
    Award,
    MapPin,
    MessageSquare,
    FileCheck,
    Mail,
    CheckSquare,
    Sliders,
    Leaf,
    Landmark,
    Truck
} from "lucide-react";

interface SidebarGroup {
    cluster: string;
    items: {
        label: string;
        path: string;
        type?: string;
        icon: any;
    }[];
}

const SIDEBAR_GROUPS: SidebarGroup[] = [
    {
        cluster: "Main Reports",
        items: [
            { label: "Overview", path: "/flow/reports/overview", icon: LayoutGrid },
        ]
    },
    {
        cluster: "Progress Report",
        items: [
            { label: "Daily Reports", path: "/flow/reports/daily", type: "daily", icon: Calendar },
            { label: "Weekly Reports", path: "/flow/reports/weekly", type: "weekly", icon: FileText },
            { label: "Monthly Reports", path: "/flow/reports/monthly", type: "monthly", icon: CalendarCheck },
            { label: "Schedule & S-Curve", path: "/flow/reports/schedule", type: "schedule", icon: TrendingUp },
        ]
    },
    {
        cluster: "Cost & Logistics",
        items: [
            { label: "Cost & Budget", path: "/flow/reports/cost", type: "cost", icon: DollarSign },
            { label: "Manpower & Payroll", path: "/flow/reports/manpower", type: "manpower", icon: Users },
            { label: "Procurement & Stock", path: "/flow/reports/procurement", type: "procurement", icon: Package },
            { label: "Finance Register", path: "/flow/reports/finance", type: "finance", icon: Landmark },
            { label: "Equipment & Asset", path: "/flow/reports/resources", type: "resources", icon: Truck },
        ]
    },
    {
        cluster: "QA/QC, HSE & Risk",
        items: [
            { label: "Quality (QA/QC)", path: "/flow/reports/quality", type: "quality", icon: ShieldCheck },
            { label: "Safety (HSE/K3)", path: "/flow/reports/safety", type: "safety", icon: HardHat },
            { label: "Issue & Risk", path: "/flow/reports/issue_risk", type: "issue_risk", icon: AlertOctagon },
        ]
    },
    {
        cluster: "Governance, Contract & Exec",
        items: [
            { label: "Document Control (DOC)", path: "/flow/reports/doc_control", type: "doc_control", icon: FileSpreadsheet },
            { label: "Change Order (CCO)", path: "/flow/reports/change_order", type: "change_order", icon: FileDiff },
            { label: "MOU & Contract (MOU)", path: "/flow/reports/mou_contract", type: "mou_contract", icon: FileCheck },
            { label: "Executive Report (EXE)", path: "/flow/reports/executive", type: "executive", icon: Award },
        ]
    },
    {
        cluster: "Site Ops & Formal",
        items: [
            { label: "Site Survey (SUR)", path: "/flow/reports/site_survey", type: "site_survey", icon: MapPin },
            { label: "Minute of Meeting (MOM)", path: "/flow/reports/mom", type: "mom", icon: MessageSquare },
            { label: "Memo & Notice (NOT)", path: "/flow/reports/memo_correspondence", type: "memo_correspondence", icon: Mail },
            { label: "Punch List BAST (PCH)", path: "/flow/reports/punch_list", type: "punch_list", icon: CheckSquare },
            { label: "Commissioning (COM)", path: "/flow/reports/commissioning", type: "commissioning", icon: Sliders },
            { label: "Environmental (ENV)", path: "/flow/reports/environmental", type: "environmental", icon: Leaf },
        ]
    }
];


export default function ReportsSidebar() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const typeParam = searchParams.get("type");

    const isActive = (item: { path: string; type?: string }) => {
        if (item.path === "/flow/reports/overview") {
            return pathname === "/flow/reports/overview" || pathname === "/flow/reports";
        }
        if (pathname === "/flow/reports/editor" && item.type) {
            return typeParam === item.type;
        }
        return pathname.startsWith(item.path);
    };

    return (
        <>
            {/* DESKTOP SIDEBAR */}
            <aside className="w-full hidden lg:flex flex-col space-y-4 max-h-[85vh] overflow-y-auto pr-1 scrollbar-thin">
                {SIDEBAR_GROUPS.map((group, idx) => (
                    <div key={idx} className="space-y-1">
                        {group.cluster !== "Main" && (
                            <div className="px-3 text-[10px] font-black uppercase tracking-wider text-neutral-400 dark:text-neutral-500 pt-2 pb-0.5">
                                {group.cluster}
                            </div>
                        )}
                        <div className="space-y-0.5">
                            {group.items.map((item) => {
                                const active = isActive(item);
                                const Icon = item.icon;
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
                                        <Icon className={clsx("w-4 h-4 shrink-0 transition-colors", active ? "text-neutral-900 dark:text-white" : "text-neutral-400")} />
                                        <span className="truncate">{item.label}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </aside>

            {/* MOBILE BOTTOM NAVIGATION */}
            <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center justify-center gap-3 w-full px-4 max-w-sm safe-area-bottom">
                <div className="bg-white/70 dark:bg-neutral-900/70 backdrop-blur-md shadow-lg rounded-full px-4 py-2 flex items-center justify-center gap-4 border border-neutral-200/50 dark:border-neutral-800/50">
                    <Link
                        href="/flow/reports/overview"
                        className={clsx(
                            "flex items-center justify-center transition-all duration-200 rounded-full p-2.5",
                            pathname === "/flow/reports/overview" ? "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400" : "text-neutral-400"
                        )}
                    >
                        <LayoutGrid className="w-5 h-5" />
                    </Link>
                    <Link
                        href="/flow/reports/daily"
                        className={clsx(
                            "flex items-center justify-center transition-all duration-200 rounded-full p-2.5",
                            pathname.startsWith("/flow/reports/daily") || (pathname === "/flow/reports/editor" && typeParam === "daily") ? "bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400" : "text-neutral-400"
                        )}
                    >
                        <Calendar className="w-5 h-5" />
                    </Link>
                    <Link
                        href="/flow/reports/weekly"
                        className={clsx(
                            "flex items-center justify-center transition-all duration-200 rounded-full p-2.5",
                            pathname.startsWith("/flow/reports/weekly") || (pathname === "/flow/reports/editor" && typeParam === "weekly") ? "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400" : "text-neutral-400"
                        )}
                    >
                        <FileText className="w-5 h-5" />
                    </Link>
                    <Link
                        href="/flow/reports/monthly"
                        className={clsx(
                            "flex items-center justify-center transition-all duration-200 rounded-full p-2.5",
                            pathname.startsWith("/flow/reports/monthly") || (pathname === "/flow/reports/editor" && typeParam === "monthly") ? "bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400" : "text-neutral-400"
                        )}
                    >
                        <CalendarCheck className="w-5 h-5" />
                    </Link>

                </div>
            </div>
        </>
    );
}

