"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, CheckSquare, FolderKanban, Bell, Play, Square, ArrowUpRight, ArrowDownRight, MapPin, Clock } from "lucide-react";
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
  const { isCheckedIn, elapsed, toggleClock, formatTime, status, startTime, locationCode, remoteMode } = useClock();
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

        {/* CLOCK WIDGET (LIQUID GLASS) */}
        <div className={clsx(
          "mb-6 p-5 rounded-2xl border transition-all duration-300 group relative overflow-hidden",
          !isCheckedIn && "bg-gradient-to-br from-neutral-50 to-neutral-100/50 dark:from-neutral-800 dark:to-neutral-900/50 border-neutral-200 dark:border-neutral-700 shadow-sm",
          isCheckedIn && status === "on-time" && "bg-gradient-to-br from-emerald-50/80 to-teal-50/40 dark:from-emerald-900/30 dark:to-teal-900/20 border-emerald-200/50 dark:border-emerald-700/30 shadow-[0_8px_30px_rgba(16,185,129,0.08)] ring-1 ring-emerald-100 dark:ring-emerald-900/20",
          isCheckedIn && status === "intime" && "bg-gradient-to-br from-amber-50/80 to-orange-50/40 dark:from-amber-900/30 dark:to-orange-900/20 border-amber-200/50 dark:border-amber-700/30 shadow-[0_8px_30px_rgba(245,158,11,0.08)] ring-1 ring-amber-100 dark:ring-amber-900/20",
          isCheckedIn && status === "late" && "bg-gradient-to-br from-red-50/80 to-rose-50/40 dark:from-red-900/30 dark:to-rose-900/20 border-red-200/50 dark:border-red-700/30 shadow-[0_8px_30px_rgba(239,68,68,0.08)] ring-1 ring-red-100 dark:ring-red-900/20",
          isCheckedIn && status === "overtime" && "bg-gradient-to-br from-violet-50/80 to-purple-50/40 dark:from-violet-900/30 dark:to-purple-900/20 border-violet-200/50 dark:border-violet-700/30 shadow-[0_8px_30px_rgba(139,92,246,0.08)] ring-1 ring-violet-100 dark:ring-violet-900/20",
        )}>
          {/* Glass specular highlight */}
          <div className="absolute inset-0 rounded-2xl pointer-events-none transition-colors bg-gradient-to-br from-white/40 via-transparent to-transparent opacity-100 dark:opacity-10" />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={clsx(
                  "w-10 h-10 rounded-2xl flex items-center justify-center transition-colors shadow-sm",
                  !isCheckedIn && "bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 border border-neutral-200 dark:border-neutral-700",
                  isCheckedIn && status === "on-time" && "bg-emerald-100/50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-700/30",
                  isCheckedIn && status === "intime" && "bg-amber-100/50 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 border border-amber-200/50 dark:border-amber-700/30",
                  isCheckedIn && status === "late" && "bg-red-100/50 dark:bg-red-900/40 text-red-600 dark:text-red-400 border border-red-200/50 dark:border-red-700/30",
                  isCheckedIn && status === "overtime" && "bg-violet-100/50 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400 border border-violet-200/50 dark:border-violet-700/30",
                )}>
                  <Clock className="w-5 h-5" strokeWidth={2} />
                </div>
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className={clsx(
                      "text-[10px] font-black uppercase tracking-[0.14em] leading-none",
                      !isCheckedIn && "text-neutral-500",
                      isCheckedIn && status === "on-time" && "text-emerald-700",
                      isCheckedIn && status === "intime" && "text-amber-700",
                      isCheckedIn && status === "late" && "text-red-700",
                      isCheckedIn && status === "overtime" && "text-violet-700",
                    )}>
                      {isCheckedIn ? "On Duty" : "Offline"}
                    </span>
                    {isCheckedIn && (
                      <span className="relative flex h-1.5 w-1.5 -top-0.5">
                        <span className={clsx("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                          status === "on-time" && "bg-emerald-400",
                          status === "intime" && "bg-amber-400",
                          status === "late" && "bg-red-400",
                          status === "overtime" && "bg-violet-400",
                        )} />
                        <span className={clsx("relative inline-flex rounded-full h-1.5 w-1.5",
                          status === "on-time" && "bg-emerald-500",
                          status === "intime" && "bg-amber-500",
                          status === "late" && "bg-red-500",
                          status === "overtime" && "bg-violet-500",
                        )} />
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 h-4">
                    {isCheckedIn && (locationCode || remoteMode) && (
                      <div className="flex items-center gap-1">
                        <MapPin className={clsx("w-[10px] h-[10px]",
                          status === "on-time" && "text-emerald-600",
                          status === "intime" && "text-amber-600",
                          status === "late" && "text-red-600",
                          status === "overtime" && "text-violet-600",
                        )} />
                        <span className={clsx("text-[9px] font-black uppercase tracking-tighter pt-0.5",
                          status === "on-time" && "text-emerald-700",
                          status === "intime" && "text-amber-700",
                          status === "late" && "text-red-700",
                          status === "overtime" && "text-violet-700",
                        )}>
                          {locationCode ||
                            (remoteMode === "business_trip" ? "BST" :
                              remoteMode === "other" ? "OTH" :
                                remoteMode)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className={clsx(
              "text-[34px] font-black tracking-tighter mb-4 tabular-nums transition-colors font-mono leading-none",
              isCheckedIn ? "text-neutral-900" : "text-neutral-300"
            )}>
              {isCheckedIn ? formatTime(elapsed) : "00:00:00"}
            </div>

            {isCheckedIn && (
              <div className="flex items-center p-3 rounded-2xl bg-white/60 border border-white/40 mb-5 relative overflow-hidden backdrop-blur-md shadow-sm">
                <div className="relative z-10 flex-1 flex flex-col items-center gap-1">
                  <div className="flex items-center gap-1.5 text-[9px] font-black text-neutral-400 uppercase tracking-widest">
                    <ArrowUpRight className="w-3 h-3 text-blue-500" />
                    <span>Start</span>
                  </div>
                  <span className="text-sm font-black text-neutral-800 tabular-nums leading-none">
                    {formatStartTimeLocal(startTime)}
                  </span>
                </div>
                <div className="w-[1px] h-8 bg-neutral-200/80 relative z-10" />
                <div className="relative z-10 flex-1 flex flex-col items-center gap-1">
                  <div className="flex items-center gap-1.5 text-[9px] font-black text-neutral-400 uppercase tracking-widest">
                    <ArrowDownRight className="w-3 h-3 text-emerald-500" />
                    <span>Target</span>
                  </div>
                  <span className="text-sm font-black text-neutral-800 tabular-nums leading-none">
                    {formatTargetTime(startTime)}
                  </span>
                </div>
              </div>
            )}

            <button
              onClick={() => setIsClockModalOpen(true)}
              className={clsx(
                "w-full h-12 rounded-full text-[13px] font-black uppercase tracking-wider transition-all transform active:scale-95 flex items-center justify-center gap-2 shadow-md",
                isCheckedIn
                  ? "bg-gradient-to-b from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white shadow-rose-200"
                  : "bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-blue-200"
              )}
            >
              {isCheckedIn ? <Square className="w-3.5 h-3.5 fill-current" strokeWidth={0} /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" strokeWidth={0} />}
              {isCheckedIn ? "Clock Out" : "Clock In"}
            </button>
          </div>
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
