"use client";

import { TrendingUp, Award, FileText, GraduationCap, Target } from "lucide-react";
import clsx from "clsx";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";

type CareerSection = "path" | "skills" | "reviews" | "training";

interface NavItemConfig {
  id: CareerSection;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItemConfig[] = [
  { id: "path", label: "My Career Path", shortLabel: "Path", icon: TrendingUp },
  { id: "skills", label: "Skill Matrix", shortLabel: "Skills", icon: Target },
  { id: "reviews", label: "Performance Reviews", shortLabel: "Reviews", icon: FileText },
  { id: "training", label: "Training & Exams", shortLabel: "Training", icon: GraduationCap },
];

export default function CareerSidebar() {
  const [activeSection, setActiveSection] = useState<CareerSection>("path");

  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <aside className="w-full h-full hidden md:block pt-0">
        <div className="space-y-0.5">
          <div className="px-3 mb-2">
            <h2 className="text-[10px] font-bold text-neutral-400/80 uppercase tracking-widest leading-none">Growth Context</h2>
            <p className="text-[9px] text-neutral-400/60 mt-0.5">Where a person is heading</p>
          </div>
          <div className="space-y-0.5">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
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

    </>
  );
}
