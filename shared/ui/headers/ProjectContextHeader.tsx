// shared/ui/headers/ProjectContextHeader.tsx
import React from "react";

type ProjectContextHeaderProps = {
  projectName: string;
  meta?: React.ReactNode;
  progress?: React.ReactNode;
  actions?: React.ReactNode;
};

export function ProjectContextHeader({
  projectName,
  meta,
  progress,
  actions,
}: ProjectContextHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-6 border-b border-neutral-200 pb-4">
      {/* LEFT */}
      <div className="min-w-0">
        <h1 className="text-lg font-semibold text-neutral-900 truncate">
          {projectName}
        </h1>

        {meta && (
          <div className="mt-1 flex flex-wrap items-center gap-1">
            {meta}
          </div>
        )}
      </div>

      {/* RIGHT */}
      {(progress || actions) && (
        <div className="flex shrink-0 items-center gap-4">
          {progress}
          {actions}
        </div>
      )}
    </div>
  );
}
