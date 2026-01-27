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
    // For overview (root) path, only exact match
    if (path === "/flow/finance") return pathname === "/flow/finance";
    // For other paths, use startsWith
    return pathname.startsWith(path);
  };

  return (
    <aside className="w-full h-full hidden lg:flex flex-col justify-between pb-6">
      <div className="space-y-6 pt-2">
        <div className="space-y-1">
          {visibleItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                href={item.path}
                className={clsx(
                  "w-full text-left rounded-lg px-3 py-2 text-sm font-medium transition-all flex items-center gap-2",
                  active
                    ? "text-red-600 bg-red-50"
                    : "text-neutral-600 hover:bg-neutral-50"
                )}
              >
                <span className={clsx("transition-colors", active ? "text-red-600" : "text-neutral-400")}>
                  <item.icon className="w-4 h-4" />
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
