"use client";

import { useState } from "react";
import clsx from "clsx";
import { Sparkles, LayoutGrid, FileText, Layout, BookOpen, Star, MoreHorizontal, X, Plus } from "lucide-react";
import { QuickView } from "./types";
import type { LucideIcon } from "lucide-react";

type Props = {
  activeView: QuickView;
  onViewChange: (view: QuickView) => void;
};

interface NavItemConfig {
  id: QuickView;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItemConfig[] = [
  { id: "all", label: "All Knowledge", shortLabel: "All", icon: LayoutGrid },
  { id: "documentation", label: "Documentation", shortLabel: "Docs", icon: FileText },
  { id: "templates", label: "Templates", shortLabel: "Template", icon: Layout },
  { id: "references", label: "References", shortLabel: "Ref", icon: BookOpen },
  { id: "favorite", label: "Favorites", shortLabel: "Faves", icon: Star },
];

export default function LearnSidebar({ activeView, onViewChange }: Props) {
  const [showFanMenu, setShowFanMenu] = useState(false);

  const handleNav = (id: QuickView) => {
    onViewChange(id);
    setShowFanMenu(false);
  };

  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <div className="space-y-4 hidden lg:block overflow-y-auto max-h-full scrollbar-hide">
        <div className="space-y-0.5 pt-0">

          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={clsx(
                "w-full text-left rounded-lg text-[12px] transition-all flex items-center gap-2.5 px-3 py-1.5",
                activeView === item.id
                  ? "text-neutral-900 dark:text-white bg-neutral-500/10 dark:bg-neutral-400/20 font-semibold shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]"
                  : "text-neutral-500 hover:bg-white/40 dark:hover:bg-neutral-800/40 hover:text-neutral-800 dark:hover:text-neutral-200 font-medium"
              )}
            >
              <item.icon className={clsx("w-4 h-4 shrink-0 transition-colors", activeView === item.id ? "text-neutral-900 dark:text-white" : "text-neutral-400")} />
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* MOBILE BOTTOM NAVIGATION - Clock/MyTasks Hybrid Pattern */}
      <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 w-full px-4 max-w-sm safe-area-bottom">
        {/* 1. Main Nav Bar (Pill) */}
        <div className="flex-1 bg-white/50 backdrop-blur-sm backdrop-saturate-150 shadow-sm rounded-full px-2 py-1.5 flex justify-between items-center">
          {NAV_ITEMS.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={clsx(
                  "flex items-center justify-center transition-all duration-200 rounded-full p-2.5",
                  isActive && "bg-orange-50"
                )}
              >
                <item.icon
                  className={clsx(
                    "w-5 h-5 transition-colors",
                    isActive ? "text-orange-600" : "text-neutral-400"
                  )}
                  strokeWidth={isActive ? 2 : 1.5}
                />
              </button>
            );
          })}
        </div>

        {/* 2. Add Knowledge FAB */}
        <button
          onClick={() => console.log("Add Knowledge Clicked")}
          className="w-12 h-12 flex items-center justify-center rounded-full shadow-lg bg-orange-500 text-white transition-transform active:scale-95 flex-shrink-0"
          style={{ backgroundColor: '#F97316' }} // Force Orange
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>
    </>
  );
}
