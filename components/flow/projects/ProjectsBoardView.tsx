"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronUp, ChevronDown } from "lucide-react";
import {
  ProjectStage,
  PROJECT_STAGE_LABEL_SHORT,
  PROJECT_STAGE_ORDER,
  PROJECT_STAGES,
} from "@/shared/constants/project-stage";
import {
  ProjectStatus,
  PROJECT_STATUS_LABEL,
} from "@/shared/constants/project-status";

/* ======================
   TYPES
====================== */

import { Project, getProjectSlug } from "./data";

export type ProjectsGroupBy = "status" | "stage";
type SortKey = "projectNo" | "progress" | "stage" | "status" | "lastUpdate";
type SortDir = "asc" | "desc";

/* ======================
   ORDER & COLOR
====================== */

const STATUS_ORDER: ProjectStatus[] = [
  "at-risk",
  "overloaded",
  "delayed",
  "on-track",
  "completed",
];

// NEW ACCENT SYSTEM
const STATUS_ACCENT: Record<ProjectStatus, { border: string; bg: string; text: string; badge: string }> = {
  "at-risk": { border: "border-l-red-500", bg: "bg-red-50", text: "text-red-700", badge: "bg-red-100 text-red-700" },
  overloaded: { border: "border-l-orange-500", bg: "bg-orange-50", text: "text-orange-700", badge: "bg-orange-100 text-orange-700" },
  delayed: { border: "border-l-yellow-500", bg: "bg-yellow-50", text: "text-yellow-700", badge: "bg-yellow-100 text-yellow-700" },
  "on-track": { border: "border-l-neutral-400", bg: "bg-neutral-50", text: "text-neutral-600", badge: "bg-neutral-100 text-neutral-600" },
  completed: { border: "border-l-green-500", bg: "bg-green-50", text: "text-green-700", badge: "bg-green-100 text-green-700" },
};

function progressBarColor(progress: number) {
  if (progress <= 20) return "bg-red-500";
  if (progress <= 40) return "bg-orange-500";
  if (progress <= 60) return "bg-yellow-500";
  if (progress <= 80) return "bg-blue-500";
  return "bg-green-500";
}

/* ======================
   HELPERS
====================== */

function groupProjects(projects: Project[], groupBy: ProjectsGroupBy) {
  const map = new Map<string, Project[]>();

  projects.forEach((p) => {
    const k = p[groupBy];
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(p);
  });

  if (groupBy === "status") {
    return STATUS_ORDER.map((k) => ({
      key: k,
      items: map.get(k) ?? [],
    }));
  }

  return PROJECT_STAGES.map((s) => ({
    key: s.key,
    items: map.get(s.key) ?? [],
  }));
}

function sortItems(items: Project[], key: SortKey, dir: SortDir) {
  const mult = dir === "asc" ? 1 : -1;

  return [...items].sort((a, b) => {
    if (key === "projectNo") return mult * a.projectNo.localeCompare(b.projectNo);
    if (key === "progress") return mult * (a.progress - b.progress);
    if (key === "stage")
      return mult * (PROJECT_STAGE_ORDER[a.stage] - PROJECT_STAGE_ORDER[b.stage]);
    if (key === "status")
      return mult * (STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status));
    if (key === "lastUpdate") return mult * a.lastUpdate.localeCompare(b.lastUpdate);
    return 0;
  });
}

/* ======================
   COMPONENT
====================== */

export default function ProjectsBoardView({
  groupBy,
  projects,
}: {
  groupBy: ProjectsGroupBy;
  projects: Project[];
}) {
  const groups = useMemo(() => groupProjects(projects, groupBy), [groupBy, projects]);

  return (
    <div className="flex gap-6 overflow-x-auto pb-6 items-start px-2">
      {groups.map(({ key, items }) => (
        <BoardColumn key={key} groupKey={key} groupBy={groupBy} items={items} />
      ))}
    </div>
  );
}


function getPremiumEmptyMessage(groupBy: ProjectsGroupBy, key: string) {
  if (groupBy === "stage") {
    return "No projects currently in this phase.";
  }

  switch (key as ProjectStatus) {
    case "at-risk": return "Clear sailing. No projects currently at risk.";
    case "overloaded": return "Workload optimized. No overloaded projects.";
    case "delayed": return "On schedule. No delays reported.";
    case "on-track": return "No projects currently tracked here.";
    case "completed": return "No completed projects yet.";
    default: return "No projects to display.";
  }
}

/* ======================
   COLUMN
====================== */

function BoardColumn({
  groupKey,
  groupBy,
  items,
}: {
  groupKey: string;
  groupBy: ProjectsGroupBy;
  items: Project[];
}) {
  const router = useRouter();
  const defaultSortKey: SortKey = groupBy === "status" ? "stage" : "status";

  const [sortKey, setSortKey] = useState<SortKey>(defaultSortKey);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [showAllCompleted, setShowAllCompleted] = useState(false);

  const sorted = useMemo(
    () => sortItems(items, sortKey, sortDir),
    [items, sortKey, sortDir]
  );

  const visibleItems =
    groupKey === "completed" && !showAllCompleted
      ? sorted.slice(0, 5)
      : sorted;

  const isAttention = groupBy === "status" && groupKey === "at-risk";

  const title = groupBy === "status"
    ? PROJECT_STATUS_LABEL[groupKey as ProjectStatus]
    : PROJECT_STAGE_LABEL_SHORT[groupKey as ProjectStage];

  return (
    <div className="w-[300px] shrink-0 space-y-3">
      {/* HEADER: Single Line */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-neutral-900">{title}</span>
          <span className="text-xs font-medium text-neutral-500 bg-neutral-200/60 px-2 py-0.5 rounded-full">
            {items.length}
          </span>
        </div>
        {isAttention && (
          <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" title="Needs Attention" />
        )}
      </div>

      {/* BODY */}
      <div className="space-y-3">
        {visibleItems.length === 0 && (
          <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-neutral-200 bg-neutral-50/50 p-4 text-center">
            <span className="text-xs text-neutral-400 font-medium">
              {getPremiumEmptyMessage(groupBy, groupKey)}
            </span>
          </div>
        )}

        {visibleItems.map((p) => {
          const accent = STATUS_ACCENT[p.status];
          return (
            <div
              key={p.id}
              onClick={() => router.push(`/flow/projects/${getProjectSlug(p)}`)}
              className="group cursor-pointer rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition-all hover:border-neutral-300 hover:shadow-none"
            >
              {/* HEADER: Name + Meta */}
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-neutral-900 leading-snug mb-1 group-hover:text-brand-red transition-colors">
                  {p.name}
                </h4>
                {/* Meta: No Mono font, Clean text */}
                <div className="flex items-center gap-2 text-[11px] text-neutral-500 font-medium">
                  <span>{p.projectNo}</span>
                  <span className="text-neutral-300">•</span>
                  <span>{p.code}</span>
                </div>
              </div>

              {/* PROGRESS */}
              <div className="space-y-1.5 mb-4">
                <div className="flex justify-between text-[10px] uppercase tracking-wide font-medium text-neutral-500">
                  <span>Progress</span>
                  <span>{p.progress}%</span>
                </div>
                <div className="h-1 w-full rounded-full bg-neutral-100 overflow-hidden">
                  <div
                    className={`h-full ${progressBarColor(p.progress)}`}
                    style={{ width: `${p.progress}%` }}
                  />
                </div>
              </div>

              {/* FOOTER */}
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${accent.badge}`}>
                  {PROJECT_STATUS_LABEL[p.status]}
                </span>
                <span className="text-[10px] text-neutral-400">
                  {p.lastUpdate}
                </span>
              </div>
            </div>
          );
        })}

        {groupKey === "completed" && items.length > 5 && (
          <button
            onClick={() => setShowAllCompleted((v) => !v)}
            className="w-full py-2 text-xs text-neutral-500 hover:text-neutral-700 font-medium"
          >
            {showAllCompleted ? "Hide completed" : "Show all completed"}
          </button>
        )}
      </div>
    </div>
  );
}
