"use client";

import { Users, ClipboardList, CalendarClock, Wallet, TrendingUp, FileCheck } from "lucide-react";
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
      <aside className="w-full h-full hidden lg:flex flex-col justify-between pb-6">
        <div className="space-y-6 pt-2">
          <div className="space-y-1">
            {visibleItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onSectionChange(item.id)}
                className={clsx(
                  "w-full text-left rounded-lg px-3 py-2 text-sm font-medium transition-all flex items-center gap-2",
                  activeSection === item.id
                    ? "text-blue-600 bg-blue-50"
                    : "text-neutral-600 hover:bg-neutral-50"
                )}
              >
                <span className={clsx("transition-colors", activeSection === item.id ? "text-blue-600" : "text-neutral-400")}>
                  <item.icon className="w-4 h-4" />
                </span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* MOBILE BOTTOM NAVIGATION - iOS Style */}
      <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 w-full px-4 max-w-md">
        <div className="flex-1 bg-white/50 backdrop-blur-sm backdrop-saturate-150 shadow-sm rounded-full px-2 py-2 flex justify-between items-center">
          {visibleItems.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSectionChange(item.id)}
                className={clsx(
                  "relative flex items-center justify-center transition-all duration-200 rounded-full",
                  isActive
                    ? "bg-blue-100 p-2"
                    : "p-2"
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

        {/* FAB - Integrated in Bottom Bar Layout (Separate Circle) */}
        {fabAction && (
          <button
            onClick={fabAction.onClick}
            className={clsx(
              "w-12 h-12 flex items-center justify-center rounded-full shadow-lg transition-transform active:scale-95 flex-shrink-0",
              fabAction.highlight ? "bg-red-500 text-white" : "bg-blue-500 text-white"
            )}
          >
            {fabAction.icon}
          </button>
        )}
      </div>
    </>
  );
}
