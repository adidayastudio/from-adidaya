"use client";

import { Users, ClipboardList, CalendarClock, Wallet, TrendingUp, FileCheck, Plus } from "lucide-react";
import clsx from "clsx";
import { UserRole } from "@/hooks/useUserProfile";

export type CrewSection = "directory" | "assignments" | "daily-input" | "payroll" | "performance" | "requests";

interface FabAction {
  icon: React.ReactNode;
  onClick: () => void;
  title: string;
  highlight?: boolean;
}

interface CrewSidebarProps {
  activeSection: CrewSection;
  onSectionChange: (section: CrewSection) => void;
  role?: UserRole;
  fabAction?: FabAction;
}

const NAV_ITEMS = [
  { id: "directory" as CrewSection, label: "Directory", icon: Users },
  { id: "assignments" as CrewSection, label: "Assignment", icon: ClipboardList },
  { id: "daily-input" as CrewSection, label: "Daily Log", icon: CalendarClock },
  { id: "payroll" as CrewSection, label: "Payroll", icon: Wallet },
  { id: "performance" as CrewSection, label: "KPI", icon: TrendingUp },
  { id: "requests" as CrewSection, label: "Requests", icon: FileCheck },
];

export default function CrewSidebar({ activeSection, onSectionChange, role = "staff", fabAction }: CrewSidebarProps) {
  const visibleItems = NAV_ITEMS;

  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <aside className="w-full hidden lg:flex flex-col">
        <div className="space-y-0 pt-0">
          <div className="space-y-0.5">
            {visibleItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onSectionChange(item.id)}
                className={clsx(
                  "w-full text-left rounded-lg text-[12px] transition-all flex items-center gap-2.5 px-3 py-1.5",
                  activeSection === item.id
                    ? "text-neutral-900 dark:text-white bg-neutral-500/10 dark:bg-neutral-400/20 font-semibold shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]"
                    : "text-neutral-500 hover:bg-white/40 dark:hover:bg-neutral-800/40 hover:text-neutral-800 dark:hover:text-neutral-200 font-medium"
                )}
              >
                <item.icon className={clsx("w-4 h-4 shrink-0 transition-colors", activeSection === item.id ? "text-neutral-900 dark:text-white" : "text-neutral-400")} />
                <span className="truncate">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* MOBILE BOTTOM NAVIGATION */}
      <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 w-full px-4 max-w-sm safe-area-bottom">
        {/* 1. Main Nav Bar (Pill) */}
        <div className="flex-1 bg-white/50 backdrop-blur-sm backdrop-saturate-150 shadow-sm rounded-full px-2 py-1.5 flex justify-between items-center border border-white/40">
          {visibleItems.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSectionChange(item.id)}
                className={clsx(
                  "flex items-center justify-center transition-all duration-200 rounded-full p-2.5",
                  isActive && "bg-blue-50"
                )}
              >
                <item.icon
                  className={clsx(
                    "w-5 h-5 transition-colors",
                    isActive ? "text-blue-600" : "text-neutral-400"
                  )}
                  strokeWidth={isActive ? 2 : 1.5}
                />
              </button>
            );
          })}
        </div>

        {/* 2. Add Crew FAB */}
        {fabAction && (
          <button
            onClick={fabAction.onClick}
            className={clsx(
              "w-12 h-12 flex items-center justify-center rounded-full shadow-lg text-white transition-transform active:scale-95 flex-shrink-0",
              fabAction.highlight ? "bg-red-500" : "bg-blue-600"
            )}
          >
            {fabAction.icon || <Plus className="w-6 h-6" />}
          </button>
        )}
      </div>
    </>
  );
}
