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

    </>
  );
}
