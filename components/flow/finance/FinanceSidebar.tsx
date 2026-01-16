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
  MoreHorizontal
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
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
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const { canAccessTeam } = useFinance();

  // Filter items based on user access
  const visibleItems = NAV_ITEMS.filter(item => !item.teamOnly || canAccessTeam);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setIsMoreOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isActive = (path: string) => {
    // For overview (root) path, only exact match
    if (path === "/flow/finance") return pathname === "/flow/finance";
    // For other paths, use startsWith
    return pathname.startsWith(path);
  };

  const mobileMainItems = visibleItems.slice(0, 5);
  const mobileMoreItems = visibleItems.slice(5);

  return (
    <>
      {/* DESKTOP SIDEBAR */}
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

      {/* MOBILE BOTTOM NAVIGATION */}
      <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center justify-center gap-3 w-full px-4 max-w-sm safe-area-bottom">
        <div className="bg-white/50 backdrop-blur-sm backdrop-saturate-150 shadow-sm rounded-full px-4 py-1.5 flex items-center justify-center gap-4">

          {mobileMainItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                href={item.path}
                className={clsx(
                  "flex items-center justify-center transition-all duration-200 rounded-full p-2.5",
                  active ? "bg-red-50 text-red-600" : "text-neutral-400"
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

          {mobileMoreItems.length > 0 && (
            <div className="relative" ref={moreMenuRef}>
              <button
                onClick={() => setIsMoreOpen(!isMoreOpen)}
                className={clsx(
                  "flex items-center justify-center transition-all duration-200 rounded-full p-2.5",
                  (isMoreOpen || mobileMoreItems.some(i => isActive(i.path))) ? "bg-red-50 text-red-600" : "text-neutral-400"
                )}
              >
                {isMoreOpen ? <div className="w-5 h-5 flex items-center justify-center">×</div> : <MoreHorizontal className="w-5 h-5" />}
              </button>

              {isMoreOpen && (
                <div className="absolute bottom-full right-0 mb-4 w-48 bg-white/90 backdrop-blur-xl border border-white/50 shadow-xl rounded-2xl p-1.5 animate-in fade-in slide-in-from-bottom-2">
                  {mobileMoreItems.map((item) => {
                    const active = isActive(item.path);
                    return (
                      <Link
                        key={item.path}
                        href={item.path}
                        onClick={() => setIsMoreOpen(false)}
                        className={clsx(
                          "w-full text-left px-3 py-2 text-xs font-medium rounded-lg flex items-center gap-3 transition-colors",
                          active
                            ? "bg-red-50 text-red-600"
                            : "text-neutral-600 hover:bg-neutral-50"
                        )}
                      >
                        <item.icon className={clsx("w-4 h-4", active ? "text-red-600" : "text-neutral-400")} />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </>
  );
}
