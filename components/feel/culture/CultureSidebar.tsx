"use client";

import { useState } from "react";
import { Star, BookOpen, Map, Heart, Activity, LayoutDashboard, Settings, Globe, Award, FileText, MoreHorizontal, X, ChevronRight } from "lucide-react";
import clsx from "clsx";

export type CultureSection = "overview" | "chapter" | "journey" | "values" | "pulse" | "handbook" | "recognition" | "team_overview" | "team_members" | "setup";

interface CultureSidebarProps {
  activeSection: CultureSection;
  onSectionChange: (section: CultureSection) => void;
  viewMode: "PERSONAL" | "TEAM";
}

// Menu Configuration
const PERSONAL_MENU = [
  { id: "overview", label: "Home", icon: Star },
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
      <aside className="w-full h-full hidden lg:flex flex-col pt-0">
        <div className="space-y-0.5">
          <div className="text-[10px] font-bold text-neutral-400/80 uppercase tracking-widest px-3 mb-2 leading-none">Culture</div>
          {mainItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
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

          {/* Separator for More Items (Desktop only) */}
          <div className="h-px bg-neutral-200/30 dark:bg-neutral-800/30 my-4 mx-3" />
          <div className="text-[10px] font-bold text-neutral-400/80 uppercase tracking-widest px-3 mb-2 leading-none">Resources</div>
          
          {MORE_MENU.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
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
      </aside>

    </>
  );
}
