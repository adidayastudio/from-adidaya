"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import {
  LayoutDashboard,
  Box,
  MapPin,
  Wrench,
  TrendingDown,
  BarChart,
  Settings,
  MoreHorizontal
} from "lucide-react";
import { useState, useRef, useEffect } from "react";

/* ======================
   NAV ITEMS CONFIG
====================== */
const NAV_ITEMS = [
  { label: "Overview", path: "/flow/asset", icon: LayoutDashboard },
  { label: "Asset List", path: "/flow/asset/list", icon: Box },
  { label: "Allocation", path: "/flow/asset/allocation", icon: MapPin },
  { label: "Maintenance", path: "/flow/asset/maintenance", icon: Wrench },
  { label: "Depreciation", path: "/flow/asset/depreciation", icon: TrendingDown },
  { label: "Reports", path: "/flow/asset/reports", icon: BarChart },
  { label: "Settings", path: "/flow/asset/settings", icon: Settings },
];

export default function AssetSidebar() {
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
    if (path === "/flow/asset") return pathname === "/flow/asset";
    // For other paths, use startsWith
    return pathname.startsWith(path);
  };

  const mobileMainItems = NAV_ITEMS.slice(0, 5);
  const mobileMoreItems = NAV_ITEMS.slice(5);

  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <aside className="w-full h-full hidden lg:flex flex-col justify-between pb-6">
        <div className="space-y-6 pt-2">
          <div className="space-y-1">
            {NAV_ITEMS.map((item) => {
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
