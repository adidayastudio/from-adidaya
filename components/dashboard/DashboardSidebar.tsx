"use client";

import clsx from "clsx";
import { LayoutDashboard, CalendarDays, AlertCircle, Clock, Play, Square } from "lucide-react";
import { useClock } from "@/hooks/useClock";
import useUserProfile from "@/hooks/useUserProfile";
import ClockActionModal from "@/components/feel/clock/ClockActionModal";
import { useState } from "react";
import { formatTargetTime } from "@/lib/work-hours-utils";

export type DashboardView = "overview" | "today" | "week" | "overdue";

interface DashboardSidebarProps {
  activeView: DashboardView;
  onChangeView: (view: DashboardView) => void;
}

// Dynamic Calendar Icon (like iOS - shows today's date)
function DynamicCalendarIcon({ className, isActive }: { className?: string; isActive?: boolean }) {
  const today = new Date().getDate();
  return (
    <div className={clsx(
      "relative flex items-center justify-center transition-colors",
      className,
      isActive ? "text-neutral-900" : "text-neutral-400"
    )}>
      {/* Calendar outline */}
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
      {/* Date number */}
      <span className="absolute text-[8px] font-bold leading-none" style={{ top: '55%' }}>
        {today}
      </span>
    </div>
  );
}

const NAV_ITEMS = [
  { id: "overview" as DashboardView, label: "Overview", icon: LayoutDashboard },
  { id: "today" as DashboardView, label: "Today", icon: null, customIcon: true }, // Uses DynamicCalendarIcon
  { id: "week" as DashboardView, label: "This Week", icon: CalendarDays },
  { id: "overdue" as DashboardView, label: "Overdue", icon: AlertCircle },
];

export default function DashboardSidebar({ activeView, onChangeView }: DashboardSidebarProps) {
  const { isCheckedIn, elapsed, toggleClock, formatTime, status, startTime } = useClock();
  const [isClockModalOpen, setIsClockModalOpen] = useState(false);
  const { profile } = useUserProfile();

  const formatStartTimeLocal = (date: Date | null) => {
    if (!date) return "--:--";
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
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
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => onChangeView(item.id)}
              className={clsx(
                "w-full text-left rounded-lg px-3 py-2 text-sm font-medium transition-all flex items-center gap-2",
                activeView === item.id
                  ? "text-neutral-900 bg-neutral-100"
                  : "text-neutral-600 hover:bg-neutral-50"
              )}
            >
              {item.customIcon ? (
                <DynamicCalendarIcon className="w-4 h-4" isActive={activeView === item.id} />
              ) : item.icon && (
                <item.icon className={clsx("w-4 h-4 transition-colors", activeView === item.id ? "text-neutral-900" : "text-neutral-400")} />
              )}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </aside>

      {/* MOBILE BOTTOM NAVIGATION */}
      <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 w-full px-4 max-w-sm">
        <div className="flex-1 bg-white/50 backdrop-blur-sm backdrop-saturate-150 shadow-sm rounded-full px-3 py-2 flex justify-between items-center">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => onChangeView(item.id)}
              className={clsx(
                "relative flex items-center justify-center transition-all duration-200 rounded-full p-2.5",
                activeView === item.id ? "bg-neutral-100" : ""
              )}
            >
              {item.customIcon ? (
                <DynamicCalendarIcon className="w-5 h-5" isActive={activeView === item.id} />
              ) : item.icon && (
                <item.icon
                  className={clsx(
                    "w-5 h-5 transition-colors",
                    activeView === item.id ? "text-neutral-900" : "text-neutral-400"
                  )}
                  strokeWidth={activeView === item.id ? 2 : 1.5}
                />
              )}
            </button>
          ))}
        </div>

        {/* FAB */}
        <button
          onClick={() => setIsClockModalOpen(true)}
          className={clsx(
            "w-12 h-12 flex items-center justify-center rounded-full shadow-lg transition-transform active:scale-95 flex-shrink-0 text-white",
            isCheckedIn ? "bg-red-500 animate-pulse-slow" : "bg-blue-600"
          )}
        >
          {isCheckedIn ? <Square className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
        </button>
      </div>

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
