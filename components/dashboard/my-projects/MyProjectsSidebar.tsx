"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import {
  LayoutDashboard,
  FolderKanban,
  AlertCircle,
  Activity,
  Archive,
  FolderOpen
} from "lucide-react";

export type MyProjectsSection = "overview" | "active" | "attention" | "updates" | "archived";

const NAV_ITEMS = [
  { id: "overview", label: "Overview", path: "/dashboard/projects/overview", icon: LayoutDashboard },
  { id: "active", label: "Active Projects", path: "/dashboard/projects/active", icon: FolderKanban },
  { id: "attention", label: "Need Attention", path: "/dashboard/projects/attention", icon: AlertCircle },
  { id: "updates", label: "Updates", path: "/dashboard/projects/updates", icon: Activity },
  { id: "archived", label: "Archived", path: "/dashboard/projects/archived", icon: Archive },
];

export default function MyProjectsSidebar() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname === path;
  };

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
                  key={item.id}
                  href={item.path}
                  className={clsx(
                    "w-full text-left rounded-lg px-3 py-2 text-sm font-medium transition-all flex items-center gap-2",
                    active
                      ? "text-neutral-900 bg-neutral-100"
                      : "text-neutral-600 hover:bg-neutral-50"
                  )}
                >
                  <span className={clsx("transition-colors", active ? "text-neutral-900" : "text-neutral-400")}>
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
      <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 w-full px-4 max-w-sm safe-area-bottom">
        <div className="flex-1 bg-white/50 backdrop-blur-sm backdrop-saturate-150 shadow-sm rounded-full px-3 py-2 flex justify-between items-center relative">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.id}
                href={item.path}
                className={clsx(
                  "relative flex items-center justify-center transition-all duration-200 rounded-full",
                  active ? "bg-neutral-100 p-2.5" : "p-2.5"
                )}
              >
                <item.icon
                  className={clsx(
                    "w-5 h-5 transition-colors",
                    active ? "text-neutral-900" : "text-neutral-400"
                  )}
                  strokeWidth={active ? 2 : 1.5}
                />
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
