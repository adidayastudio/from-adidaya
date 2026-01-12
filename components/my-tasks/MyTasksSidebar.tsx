"use client";

import clsx from "clsx";
import { CalendarDays, AlertCircle, CheckSquare, CheckCircle2 } from "lucide-react";

export type MyTasksSection = "today" | "this-week" | "overdue" | "all-tasks" | "completed";

interface MyTasksSidebarProps {
  activeSection: MyTasksSection;
  onSectionChange: (section: MyTasksSection) => void;
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
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
      <span className="absolute text-[8px] font-bold leading-none" style={{ top: '55%' }}>
        {today}
      </span>
    </div>
  );
}

const NAV_ITEMS: { id: MyTasksSection; label: string; icon: any; customIcon?: boolean }[] = [
  { id: "today", label: "Today", icon: null, customIcon: true },
  { id: "this-week", label: "This Week", icon: CalendarDays },
  { id: "overdue", label: "Overdue", icon: AlertCircle },
  { id: "all-tasks", label: "All Tasks", icon: CheckSquare },
  { id: "completed", label: "Completed", icon: CheckCircle2 },
];

export default function MyTasksSidebar({ activeSection, onSectionChange }: MyTasksSidebarProps) {
  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <aside className="w-full h-full hidden lg:flex flex-col pb-6">
        <div className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={clsx(
                "w-full text-left rounded-lg px-3 py-2 text-sm font-medium transition-all flex items-center gap-2",
                activeSection === item.id
                  ? "text-neutral-900 bg-neutral-100"
                  : "text-neutral-600 hover:bg-neutral-50"
              )}
            >
              {item.customIcon ? (
                <DynamicCalendarIcon className="w-4 h-4" isActive={activeSection === item.id} />
              ) : (
                <item.icon className={clsx("w-4 h-4 transition-colors", activeSection === item.id ? "text-neutral-900" : "text-neutral-400")} />
              )}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </aside>

      {/* MOBILE BOTTOM NAVIGATION */}
      <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full px-4 max-w-sm safe-area-bottom">
        <div className="bg-white/50 backdrop-blur-sm backdrop-saturate-150 shadow-sm rounded-full px-2 py-1.5 flex justify-between items-center">
          {NAV_ITEMS.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSectionChange(item.id)}
                className={clsx(
                  "flex items-center justify-center transition-all duration-200 rounded-full p-2.5",
                  isActive && "bg-neutral-100"
                )}
              >
                {item.customIcon ? (
                  <DynamicCalendarIcon className="w-5 h-5" isActive={isActive} />
                ) : (
                  <item.icon
                    className={clsx("w-5 h-5 transition-colors", isActive ? "text-neutral-900" : "text-neutral-400")}
                    strokeWidth={isActive ? 2 : 1.5}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
