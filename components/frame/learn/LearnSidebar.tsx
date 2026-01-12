"use client";

import { useState } from "react";
import clsx from "clsx";
import { Sparkles, BookOpen, FileText, Layout, Clock, Star, MoreHorizontal, X, Plus } from "lucide-react";
import { QuickView } from "./types";
import type { LucideIcon } from "lucide-react";

type Props = {
  activeView: QuickView;
  onViewChange: (view: QuickView) => void;
  onAskAI: () => void;
};

interface NavItemConfig {
  id: QuickView;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItemConfig[] = [
  { id: "all", label: "All Knowledge", shortLabel: "All", icon: BookOpen },
  { id: "documentation", label: "Documentation", shortLabel: "Docs", icon: FileText },
  { id: "templates", label: "Templates", shortLabel: "Template", icon: Layout },
  { id: "recent", label: "Recently Viewed", shortLabel: "Recent", icon: Clock },
  { id: "favorite", label: "Favorites", shortLabel: "Faves", icon: Star },
];

export default function LearnSidebar({ activeView, onViewChange, onAskAI }: Props) {
  const [showFanMenu, setShowFanMenu] = useState(false);

  const handleNav = (id: QuickView) => {
    onViewChange(id);
    setShowFanMenu(false);
  };

  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <div className="space-y-6 hidden lg:block">
        <button
          onClick={onAskAI}
          className="w-full flex items-center gap-2 px-3 py-3 rounded-xl bg-bg-soft border border-border-soft text-action-primary hover:bg-bg-raised transition-all group"
        >
          <div className="w-8 h-8 rounded-lg bg-white/50 flex items-center justify-center group-hover:bg-white transition-colors">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="text-left">
            <div className="text-sm font-semibold">Ask Adidaya</div>
            <div className="text-[10px] opacity-80">AI-powered knowledge search</div>
          </div>
        </button>

        <div className="space-y-1">
          <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider px-1 mb-2">Browse</div>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={clsx(
                "w-full text-left rounded-lg px-3 py-2 text-sm font-medium transition-all flex items-center gap-2",
                activeView === item.id
                  ? "text-orange-600 bg-orange-50"
                  : "text-neutral-600 hover:bg-neutral-50"
              )}
            >
              <span className={clsx("transition-colors", activeView === item.id ? "text-orange-600" : "text-neutral-400")}>
                <item.icon className="w-4 h-4" />
              </span>
              <span>{item.label}</span>
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
