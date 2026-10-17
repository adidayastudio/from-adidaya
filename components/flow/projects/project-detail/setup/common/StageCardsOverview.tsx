"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown, ChevronUp, Plus, GitBranch, Pencil, Check } from "lucide-react";
import type { WBSStage, StageSummary, ModuleType } from "@/lib/flow/types/versioning.types";
import clsx from "clsx";

type StageCardsOverviewProps = {
  moduleType?: ModuleType;
  summaries: Record<WBSStage, StageSummary>;
  onSelectStage: (stage: WBSStage) => void;
  onChangeActiveVersion: (stage: WBSStage, versionId: string) => void;
  onCreateNewVersion: (stage: WBSStage) => void;
  onUpdateVersionName?: (stage: WBSStage, versionId: string, newName: string) => void;
};

export function StageCardsOverview({
  moduleType = "wbs",
  summaries,
  onSelectStage,
  onChangeActiveVersion,
  onCreateNewVersion,
  onUpdateVersionName,
}: StageCardsOverviewProps) {
  // Track expanded state for each stage card
  const [expandedStages, setExpandedStages] = useState<Record<WBSStage, boolean>>({
    BALLPARK: true,
    ESTIMATES: true,
    DETAIL: true,
  });

  // Track inline editing version name state
  const [editingVersionId, setEditingVersionId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>("");

  const toggleExpand = (stage: WBSStage) => {
    setExpandedStages((prev) => ({ ...prev, [stage]: !prev[stage] }));
  };

  const getStageTitle = (stage: WBSStage) => {
    const modSuffix = moduleType === "schedule" ? "Schedule" : moduleType === "rab" ? "RAB" : "WBS";
    if (stage === "BALLPARK") return `Ballpark ${modSuffix}`;
    if (stage === "ESTIMATES") return `Estimates ${modSuffix}`;
    return `Detail ${modSuffix}`;
  };

  const handleStartEditing = (versionId: string, currentName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingVersionId(versionId);
    setEditingName(currentName);
  };

  const handleSaveEditing = (stage: WBSStage, versionId: string) => {
    if (editingName.trim() && onUpdateVersionName) {
      onUpdateVersionName(stage, versionId, editingName.trim());
    }
    setEditingVersionId(null);
  };

  const STAGES: WBSStage[] = ["BALLPARK", "ESTIMATES", "DETAIL"];

  return (
    <div className="space-y-4">
      {STAGES.map((stage) => {
        const summary = summaries[stage];
        const versions = summary?.availableVersions || [];
        const isExpanded = expandedStages[stage];
        const stageTitle = getStageTitle(stage);

        return (
          <div
            key={stage}
            className="backdrop-blur-md bg-white/40 dark:bg-neutral-900/40 border border-white/60 dark:border-neutral-800/60 shadow-sm rounded-2xl overflow-hidden transition-all duration-200"
          >
            {/* Card Main Header Bar */}
            <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div
                className="flex items-center gap-3 cursor-pointer select-none"
                onClick={() => toggleExpand(stage)}
              >
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  {stageTitle}
                </h3>
              </div>

              {/* Header Right Actions */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleExpand(stage)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:text-blue-600 px-3 py-1.5 rounded-xl bg-white/50 dark:bg-neutral-800/50 border border-white/80 dark:border-neutral-700/50 transition-colors shadow-2xs"
                >
                  <span className="leading-none">
                    {versions.length} {versions.length === 1 ? "Version" : "Versions"}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                  )}
                </button>

                <button
                  onClick={() => onCreateNewVersion(stage)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 shrink-0" />
                  <span className="leading-none">New Version</span>
                </button>
              </div>
            </div>

            {/* Expanded Versions Sub-List */}
            {isExpanded && (
              <div className="px-5 pb-4 pt-1 border-t border-white/40 dark:border-neutral-800/40 bg-white/20 dark:bg-neutral-950/20 space-y-2.5">
                {versions.map((ver) => {
                  const isActive = ver.isActive;
                  const isEditingThis = editingVersionId === ver.id;

                  return (
                    <div
                      key={ver.id}
                      className={clsx(
                        "flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border backdrop-blur-sm transition-all duration-150 gap-3",
                        isActive
                          ? "bg-white/80 dark:bg-neutral-800/70 border-blue-500/40 shadow-xs ring-1 ring-blue-500/20"
                          : "bg-white/40 dark:bg-neutral-800/30 border-white/60 dark:border-neutral-700/40 hover:bg-white/60"
                      )}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono font-bold text-neutral-900 dark:text-white">
                            {ver.versionCode}
                          </span>

                          {/* Editable Version Name */}
                          {isEditingThis ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                onBlur={() => handleSaveEditing(stage, ver.id)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleSaveEditing(stage, ver.id);
                                  if (e.key === "Escape") setEditingVersionId(null);
                                }}
                                className="px-2 py-0.5 text-xs font-semibold text-neutral-900 dark:text-white bg-white dark:bg-neutral-800 border border-blue-500 rounded focus:outline-none shadow-2xs"
                                autoFocus
                              />
                              <button
                                onClick={() => handleSaveEditing(stage, ver.id)}
                                className="p-1 text-blue-600 hover:text-blue-700 rounded"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div
                              className="group inline-flex items-center gap-1.5 cursor-pointer"
                              onClick={(e) => handleStartEditing(ver.id, ver.name, e)}
                              title="Click to edit version name"
                            >
                              <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 group-hover:text-blue-600 transition-colors">
                                {ver.name}
                              </span>
                              <Pencil className="w-3 h-3 text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          )}

                          {isActive && (
                            <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                              (Active Version)
                            </span>
                          )}
                        </div>

                        {/* Source Inheritance Tag */}
                        {ver.sourceVersionName && (
                          <div className="inline-flex items-center gap-1.5 text-[11px] text-neutral-500 dark:text-neutral-400">
                            <GitBranch className="w-3 h-3 text-blue-500 shrink-0" />
                            <span>
                              Source Data:{" "}
                              <strong className="font-medium text-neutral-700 dark:text-neutral-300">
                                {(() => {
                                  const allVersions = Object.values(summaries).flatMap((s) => s.availableVersions);
                                  const sourceVer = allVersions.find(
                                    (v) => v.id === ver.sourceVersionId || v.versionCode === ver.sourceVersionId
                                  );
                                  return sourceVer
                                    ? `${sourceVer.versionCode} - ${sourceVer.name}`
                                    : ver.sourceVersionName;
                                })()}
                              </strong>
                            </span>
                          </div>
                        )}

                      </div>

                      {/* Single Open Editor Action per Version */}
                      <div className="flex items-center justify-between sm:justify-end gap-3">
                        {!isActive && (
                          <button
                            onClick={() => onChangeActiveVersion(stage, ver.id)}
                            className="text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-white font-medium px-2 py-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                          >
                            Set Active
                          </button>
                        )}

                        <button
                          onClick={() => {
                            onChangeActiveVersion(stage, ver.id);
                            onSelectStage(stage);
                          }}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors px-3 py-1.5 rounded-lg bg-blue-50/80 hover:bg-blue-100/80 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 border border-blue-200/60 dark:border-blue-800/60"
                        >
                          <span className="leading-none">Open Editor</span>
                          <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
