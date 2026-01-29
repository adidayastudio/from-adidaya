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
      <aside className="w-full h-full hidden md:block">
        <div className="space-y-6 pt-2">
          <div className="px-1">
            <h2 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Growth Context</h2>
            <p className="text-[10px] text-neutral-400 mt-1">Where a person is heading</p>
          </div>
          <div className="space-y-1">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
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
