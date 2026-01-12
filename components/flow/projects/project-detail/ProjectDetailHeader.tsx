"use client";

import {
  ProjectStatus,
  PROJECT_STATUS_LABEL,
} from "@/shared/constants/project-status";
import { Project } from "@/components/flow/projects/data";
import { PROJECT_STAGE_LABEL_SHORT } from "@/shared/constants/project-stage";
import clsx from "clsx";

/* =====================
   COLOR HELPERS
====================== */

const STATUS_THEME: Record<string, { badge: string, dot: string }> = {
  "at-risk": { badge: "bg-red-50 text-red-700 border-red-100", dot: "bg-red-500" },
  overloaded: { badge: "bg-orange-50 text-orange-700 border-orange-100", dot: "bg-orange-500" },
  delayed: { badge: "bg-yellow-50 text-yellow-700 border-yellow-100", dot: "bg-yellow-500" },
  "on-track": { badge: "bg-emerald-50 text-emerald-700 border-emerald-100", dot: "bg-emerald-500" },
  completed: { badge: "bg-brand-blue/5 text-brand-blue border-brand-blue/10", dot: "bg-brand-blue" },
  active: { badge: "bg-blue-50 text-blue-700 border-blue-100", dot: "bg-blue-500" },
  archived: { badge: "bg-neutral-100 text-neutral-600 border-neutral-200", dot: "bg-neutral-500" },
  on_hold: { badge: "bg-yellow-50 text-yellow-700 border-yellow-100", dot: "bg-yellow-500" },
};

/* =====================
   TYPES
====================== */

export interface ProjectHeaderProps {
  name: string;
  projectNo: string;
  code: string;
  type: string;
  stage: string;
  status: string;
  progress: number;
}

/* =====================
   COMPONENT
====================== */

export default function ProjectDetailHeader({ project }: { project: ProjectHeaderProps }) {
  const { name, projectNo, code, type, stage, status, progress } = project;
  const theme = STATUS_THEME[status] || STATUS_THEME["active"];

  // Mock breakdown based on progress
  const design = Math.min(100, Math.floor(progress * 1.2));
  const construction = Math.max(0, Math.floor(progress * 0.8));
  const budget = Math.floor(progress * 0.9);

  // Safe stage access
  const stageLabel = PROJECT_STAGE_LABEL_SHORT[stage as keyof typeof PROJECT_STAGE_LABEL_SHORT] || stage;

  return (
    <div className="sticky top-0 z-20 pb-4 pt-2 transition-all duration-200">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 lg:gap-8">
        {/* ================= LEFT ================= */}
        <div className="space-y-2 min-w-0 flex-1">

          {/* Main Title */}
          <div className="flex items-center gap-3 group">
            <h1 className="text-2xl lg:text-3xl font-bold text-neutral-900 tracking-tight leading-none group-hover:text-neutral-700 transition-colors cursor-default line-clamp-1 lg:line-clamp-none">
              {name}
            </h1>
            <div className={clsx("w-2 h-2 rounded-full ring-2 ring-white", theme.dot)} />
          </div>

          {/* Meta Row: Project No • Code • Stage */}
          <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-neutral-600">
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-600 text-xs font-semibold uppercase tracking-wider">
              #{projectNo}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-600 text-xs font-semibold uppercase tracking-wider">
              {code}
            </span>

            <span className="text-neutral-300 mx-1 hidden sm:inline">•</span>

            <span className={clsx("uppercase tracking-wide text-xs font-bold", theme.badge.split(" ")[1])}>
              {stageLabel}
            </span>

            <span className="text-neutral-300 mx-1 hidden sm:inline">•</span>

            <span className="text-neutral-500 font-normal text-xs sm:text-sm">
              {type === "design-only" ? "Design Only" : type === "build-only" ? "Build Only" : "Design & Build"}
            </span>
          </div>
        </div>

        {/* ================= RIGHT (Progress) ================= */}
        <div className="w-full lg:w-[280px] shrink-0 pt-4 lg:pt-0 border-t lg:border-t-0 border-neutral-100">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Overall Progress</span>
            <span className="text-lg font-bold text-neutral-900 leading-none">{progress}%</span>
          </div>

          {/* Bar */}
          <div className="h-2 w-full rounded-full bg-neutral-200 overflow-hidden mb-2">
            <div
              className={clsx("h-full rounded-full transition-all duration-500", theme.dot)}
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Mini Stats */}
          <div className="flex justify-between items-center text-[10px] uppercase font-medium text-neutral-400 tracking-wide">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
              <span>Design {design}%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-orange-400"></div>
              <span>Const. {construction}%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
              <span>Paid {budget}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Separator - Solid line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-neutral-200" />
    </div>
  );
}
