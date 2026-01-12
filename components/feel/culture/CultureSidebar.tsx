"use client";

import { useState } from "react";
import { Star, BookOpen, Map, Heart, Activity, LayoutDashboard, Settings, Globe, Award, FileText, MoreHorizontal, X, ChevronRight } from "lucide-react";
import clsx from "clsx";

export type CultureSection = "home" | "chapter" | "journey" | "values" | "pulse" | "handbook" | "recognition" | "team_overview" | "team_members" | "setup";

interface CultureSidebarProps {
  activeSection: CultureSection;
  onSectionChange: (section: CultureSection) => void;
  viewMode: "PERSONAL" | "TEAM";
}

// Menu Configuration
const PERSONAL_MENU = [
  { id: "home", label: "Home", icon: Star },
  { id: "chapter", label: "My Chapter", icon: BookOpen },
  { id: "journey", label: "Journey", icon: Map },
  { id: "values", label: "Values", icon: Heart },
  { id: "pulse", label: "Pulse", icon: Activity },
];

const TEAM_MENU = [
  { id: "team_overview", label: "Overview", icon: Globe },
  { id: "team_members", label: "Team Status", icon: Activity },
  { id: "setup", label: "Setup", icon: Settings },
];

const MORE_MENU = [
  { id: "handbook", label: "Handbook", icon: FileText },
  { id: "recognition", label: "Recognition", icon: Award },
];

export function CultureSidebar({ activeSection, onSectionChange, viewMode }: CultureSidebarProps) {
  const [showFanMenu, setShowFanMenu] = useState(false);

  const mainItems = viewMode === "PERSONAL" ? PERSONAL_MENU : TEAM_MENU;
  // For mobile we only show first 4 items + More button
  const mobileVisibleItems = mainItems.slice(0, 4);
  // Remaining items go into the "More" fan menu (if any from main list + stricter more list)
  const remainingMainItems = mainItems.slice(4);
  const fanItems = [...remainingMainItems, ...MORE_MENU];

  // Helper to handle navigation and close fan menu
  const handleNav = (id: string) => {
    onSectionChange(id as CultureSection);
    setShowFanMenu(false);
  };

  return (
    <>
      {/* DESKTOP SIDEBAR - Matches ClockSidebar logic exactly */}
      <aside className="w-full h-full hidden lg:flex flex-col justify-between pb-6">
        <div className="space-y-6 pt-2">
          <div className="space-y-1">
            {mainItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
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

            {/* Separator for More Items (Desktop only) */}
            <div className="pt-4 mt-4 border-t border-neutral-100 px-3">
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 block">Resources</span>
            </div>
            {MORE_MENU.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
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

      {/* MOBILE BOTTOM NAVIGATION - Matching ClockSidebar EXACTLY */}
      <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 w-full px-4 max-w-sm safe-area-bottom">
        <div className="flex-1 bg-white/50 backdrop-blur-sm backdrop-saturate-150 shadow-sm rounded-full px-3 py-2 flex justify-between items-center relative">

          {/* Main Visible Items */}
          {mobileVisibleItems.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className={clsx(
                  "relative flex items-center justify-center transition-all duration-200 rounded-full",
                  isActive ? "bg-blue-100 p-2.5" : "p-2.5"
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

          {/* FAN MENU Container */}
          <div className="relative">
            {/* The Fan Items */}
            <div className={clsx(
              "absolute bottom-[120%] right-[-10px] flex flex-col gap-3 transition-all duration-300 origin-bottom-right",
              showFanMenu ? "opacity-100 scale-100 translate-y-0 pointer-events-auto" : "opacity-0 scale-90 translate-y-4 pointer-events-none"
            )}>
              {fanItems.map((item, idx) => (
                <button
                  key={item.id}
                  onClick={() => handleNav(item.id)}
                  className="flex items-center justify-end gap-3 group"
                >
                  <span className="bg-white/90 backdrop-blur-sm shadow-md border border-neutral-100 px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-700 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                    {item.label}
                  </span>
                  <div className={clsx(
                    "w-10 h-10 rounded-full flex items-center justify-center shadow-lg border border-neutral-100 transition-colors",
                    activeSection === item.id ? "bg-blue-600 text-white" : "bg-white text-neutral-600 hover:bg-neutral-50"
                  )}>
                    <item.icon className="w-5 h-5" />
                  </div>
                </button>
              ))}
            </div>

            {/* The Trigger Button */}
            <button
              onClick={() => setShowFanMenu(!showFanMenu)}
              className={clsx(
                "relative flex items-center justify-center transition-all duration-300 rounded-full p-2.5",
                showFanMenu ? "bg-neutral-100 rotate-90" : "hover:bg-neutral-50"
              )}
            >
              {showFanMenu ? (
                <X className="w-5 h-5 text-neutral-600" />
              ) : (
                <MoreHorizontal className="w-5 h-5 text-neutral-400" strokeWidth={1.5} />
              )}
            </button>
          </div>

        </div>
      </div>
    </>
  );
}
