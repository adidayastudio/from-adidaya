"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import {
  LayoutDashboard,
  Receipt,
  CreditCard,
  BarChart,
  Settings,
  MoreHorizontal
} from "lucide-react";
import { useState, useRef, useEffect } from "react";

/* ======================
   NAV ITEMS CONFIG
====================== */
const NAV_ITEMS = [
  { label: "Overview", path: "/flow/expense", icon: LayoutDashboard },
  { label: "Expenses", path: "/flow/expense/list", icon: Receipt },
  { label: "Reimbursements", path: "/flow/expense/reimbursements", icon: Receipt },
  { label: "Payments", path: "/flow/expense/payments", icon: CreditCard },
  { label: "Reports", path: "/flow/expense/reports", icon: BarChart },
  { label: "Settings", path: "/flow/expense/settings", icon: Settings },
];

export default function ExpenseSidebar() {
  const pathname = usePathname();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

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
    if (path === "/flow/expense") return pathname === "/flow/expense";
    // For other paths, use startsWith
    return pathname.startsWith(path);
  };

  const mobileMainItems = NAV_ITEMS.slice(0, 5);
  const mobileMoreItems = NAV_ITEMS.slice(5);

  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <aside className="w-full h-full hidden lg:flex flex-col pt-0">
        <div className="space-y-0.5">
          <div className="text-[10px] font-bold text-neutral-400/80 uppercase tracking-widest px-3 mb-2 leading-none">Expense Management</div>
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
                          "w-full text-left px-3 py-2 text-xs font-medium rounded-xl flex items-center gap-3 transition-colors",
                          active ? "bg-red-50 text-red-600" : "text-neutral-600 hover:bg-neutral-50"
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
