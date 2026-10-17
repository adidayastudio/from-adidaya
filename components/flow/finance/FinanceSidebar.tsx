"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import {
  LayoutDashboard,
  ShoppingCart,
  Landmark,
  Receipt,
  Wallet,
  BarChart,
} from "lucide-react";
import { useFinance } from "./FinanceContext";

/* ======================
   NAV ITEMS CONFIG
====================== */
interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  teamOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Overview", path: "/flow/finance", icon: LayoutDashboard },
  { label: "Purchasing", path: "/flow/finance/purchasing", icon: ShoppingCart },
  { label: "Reimburse", path: "/flow/finance/reimburse", icon: Receipt },
  { label: "Petty Cash", path: "/flow/finance/petty-cash", icon: Wallet, teamOnly: true },
  { label: "Funding Sources", path: "/flow/finance/funding-sources", icon: Landmark, teamOnly: true },
  { label: "Reports", path: "/flow/finance/reports", icon: BarChart, teamOnly: true },
];

export default function FinanceSidebar() {
  const pathname = usePathname();
  const { canAccessTeam } = useFinance();

  // Filter items based on user access
  const visibleItems = NAV_ITEMS.filter(item => !item.teamOnly || canAccessTeam);

  const isActive = (path: string) => {
    // Exact match for root finance path
    if (path === "/flow/finance") return pathname === "/flow/finance";
    // For beta overview, also exact match or startsWith
    if (path === "/flow/finance/overview-beta") return pathname === "/flow/finance/overview-beta";
    // For other modules (purchasing, reimburse, etc), use startsWith
    return pathname.startsWith(path);
  };

  return (
    <aside className="w-full hidden lg:flex flex-col">
      <div className="space-y-0 pt-0">
        <div className="space-y-0.5">
          {visibleItems.map((item) => {
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
  );
}
