"use client";

import { useState } from "react";
import { X, GitBranch, Sparkles } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button/button";
import type { WBSStage, ProjectVersion } from "@/lib/flow/types/versioning.types";

type CreateVersionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  stage: WBSStage;
  existingVersions: ProjectVersion[];
  allStageVersions?: ProjectVersion[];
  onCreateVersion: (data: {
    versionCode: string;
    name: string;
    description?: string;
    sourceVersionId?: string;
  }) => void;
};

export function CreateVersionModal({
  isOpen,
  onClose,
  stage,
  existingVersions,
  allStageVersions = [],
  onCreateVersion,
}: CreateVersionModalProps) {
  const defaultNextNum = existingVersions.length + 1;
  const [versionCode, setVersionCode] = useState(`v${defaultNextNum}.0`);
  const [name, setName] = useState(
    defaultNextNum === 1 ? "Initial Baseline" : `Revision ${defaultNextNum}`
  );
  const [description, setDescription] = useState("");
  
  // Prefer active version, first existing version, or system default baseline template
  const [sourceVersionId, setSourceVersionId] = useState<string>(
    existingVersions.find((v) => v.isActive)?.id || existingVersions[0]?.id || "system-default-baseline"
  );

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!versionCode.trim() || !name.trim()) return;

    onCreateVersion({
      versionCode: versionCode.trim(),
      name: name.trim(),
      description: description.trim() || undefined,
      sourceVersionId: sourceVersionId || undefined,
    });
    onClose();
  };

  const stageLabels: Record<WBSStage, string> = {
    BALLPARK: "Ballpark",
    ESTIMATES: "Estimates",
    DETAIL: "Detail",
  };

  const availableProjectVersions = allStageVersions.length > 0 ? allStageVersions : existingVersions;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-lg mx-4 border border-neutral-200 dark:border-neutral-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
              <GitBranch className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
                Create New Version — {stageLabels[stage]}
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Inherit data from previous project versions or system baseline template
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Version Code <span className="text-blue-500">*</span>
              </label>
              <input
                type="text"
                value={versionCode}
                onChange={(e) => setVersionCode(e.target.value)}
                placeholder="e.g. v2.0"
                className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/40"
                required
              />
            </div>
            <div className="col-span-2">
              <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Version Name / Tag <span className="text-blue-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Client Approval / Revision 2"
                className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/40"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Source Data (Previous Version or Master Template)
            </label>
            <div className="relative">
              <select
                value={sourceVersionId}
                onChange={(e) => setSourceVersionId(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/40"
              >
                <optgroup label="System Master Template">
                  <option value="system-default-baseline">
                    ⭐ System Default Baseline Template (Reset Data)
                  </option>
                </optgroup>

                {availableProjectVersions.length > 0 && (
                  <optgroup label="Previous Project Versions">
                    {availableProjectVersions.map((v) => (
                      <option key={v.id} value={v.id}>
                        [{v.stage}] {v.versionCode} - {v.name}
                      </option>
                    ))}
                  </optgroup>
                )}

                <optgroup label="Blank / Empty">
                  <option value="">-- Blank (Start Empty Without Template) --</option>
                </optgroup>
              </select>
            </div>
            <p className="mt-1.5 text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span>New version will copy structure and data from the selected source.</span>
            </p>
          </div>

          <div>
            <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Notes / Revision Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Derived from v1.0 Baseline for client submission"
              rows={3}
              className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/40 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-medium">
              Create Version
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
