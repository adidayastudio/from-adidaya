"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, CheckSquare, FolderKanban, Bell, Play, Square } from "lucide-react";
import { useClock } from "@/hooks/useClock";
import useUserProfile from "@/hooks/useUserProfile";
import ClockActionModal from "@/components/feel/clock/ClockActionModal";
import { useState } from "react";
import { formatTargetTime } from "@/lib/work-hours-utils";

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  href: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, href: "/dashboard" },
  { id: "tasks", label: "My Tasks", icon: CheckSquare, href: "/dashboard/tasks" },
  { id: "projects", label: "My Projects", icon: FolderKanban, href: "/dashboard/projects" },
  { id: "notifications", label: "Notifications", icon: Bell, href: "/dashboard/notifications" },
];

export default function DashboardSidebar() {
  const pathname = usePathname();
  const { isCheckedIn, elapsed, toggleClock, formatTime, status, startTime } = useClock();
  const [isClockModalOpen, setIsClockModalOpen] = useState(false);
  const { profile } = useUserProfile();

  const formatStartTimeLocal = (date: Date | null) => {
    if (!date) return "--:--";
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  };

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <>

      {/* DESKTOP SIDEBAR */}
      <aside className="w-full h-full hidden lg:flex flex-col pb-6">

        {/* CLOCK WIDGET (RESTORED) */}
        <div className="mb-6 p-5 rounded-2xl border border-neutral-200 bg-white shadow-sm transition-all hover:border-neutral-300 group">
          <div className="flex items-center justify-between mb-4">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                {isCheckedIn ? "Checked In" : "Current Time"}
              </span>
              {isCheckedIn && (
                <div className={clsx(
                  "flex items-center gap-1.5 mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full w-fit transition-colors",
                  status === "on-time" && "bg-emerald-100 text-emerald-700",
                  status === "late" && "bg-orange-100 text-orange-700",
                  status === "overtime" && "bg-blue-100 text-blue-700",
                )}>
                  <div className={clsx("w-1.5 h-1.5 rounded-full",
                    status === "on-time" && "bg-emerald-500",
                    status === "late" && "bg-orange-500",
                    status === "overtime" && "bg-blue-500",
                  )} />
                  {status === "on-time" && "On Time"}
                  {status === "late" && "Late Arrival"}
                  {status === "overtime" && "Overtime"}
                </div>
              )}
            </div>
            {isCheckedIn && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            )}
          </div>

          <div className={clsx(
            "text-4xl font-bold tracking-tighter mb-2 tabular-nums transition-colors",
            isCheckedIn ? "text-neutral-900" : "text-neutral-300"
          )}>
            {isCheckedIn ? formatTime(elapsed) : "00:00:00"}
          </div>

          {isCheckedIn && (
            <div className="flex items-center justify-between text-xs text-neutral-500 font-medium mb-5 px-1">
              <span>Started: {formatStartTimeLocal(startTime)}</span>
              <span>Target: {formatTargetTime(startTime)}</span>
            </div>
          )}

          <button
            onClick={() => setIsClockModalOpen(true)}
            className={clsx(
              "w-full py-3 rounded-full text-sm font-bold shadow-md transition-all transform active:scale-95 flex items-center justify-center gap-2",
              isCheckedIn
                ? "bg-red-500 hover:bg-red-600 text-white shadow-red-200"
                : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200"
            )}
          >
            {isCheckedIn ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
            {isCheckedIn ? "Clock Out" : "Clock In"}
          </button>
        </div>

        {/* NAVIGATION */}
        <div className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.id}
                href={item.href}
                className={clsx(
                  "w-full text-left rounded-lg px-3 py-2 text-sm font-medium transition-all flex items-center gap-2",
                  active
                    ? "text-neutral-900 bg-neutral-100"
                    : "text-neutral-600 hover:bg-neutral-50"
                )}
              >
                {item.icon && (
                  <item.icon className={clsx("w-4 h-4 transition-colors", active ? "text-neutral-900" : "text-neutral-400")} />
                )}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </aside>

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
