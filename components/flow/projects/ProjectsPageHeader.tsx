"use client";

import { Tabs } from "@/shared/ui/layout/Tabs";
import { PageHeader } from "@/shared/ui/headers/PageHeader";
import { Select } from "@/shared/ui/primitives/select/select";

export type ProjectsView = "list" | "board";
export type ProjectsGroupBy = "status" | "stage";

import { Button } from "@/shared/ui/primitives/button/button";
import { Input } from "@/shared/ui/primitives/input/input";
import { Plus, Search } from "lucide-react";

// Reverting to original Props interface and component signature
export default function ProjectsPageHeader({
  view,
  groupBy,
  onChangeView,
  onChangeGroupBy,
  onAddProject,
}: {
  view: ProjectsView;
  groupBy: ProjectsGroupBy;
  onChangeView: (v: ProjectsView) => void;
  onChangeGroupBy: (v: ProjectsGroupBy) => void;
  onAddProject: () => void;
}) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Project List"
        description="Monitor project status, stages, and progress across all ongoing works."
        actions={
          <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={onAddProject}>
            Add Project
          </Button>
        }
      />

      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-4 border-b border-neutral-200 pb-0">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 pb-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 group-focus-within:text-brand-red transition-colors" />
            <Input
              placeholder="Search projects..."
              inputSize="sm"
              className="pl-9 w-60"
            />
          </div>

          <Select
            value="all-types"
            options={[
              { value: "all-types", label: "All Types" },
              { value: "design", label: "Design Only" },
              { value: "build", label: "Construction" },
              { value: "design-build", label: "Design & Build" },
            ]}
            onChange={() => { }}
            selectSize="sm"
            className="w-40"
          />

          <Select
            value="all-stages"
            options={[
              { value: "all-stages", label: "All Stages" },
              { value: "ko", label: "Kick Off" },
              { value: "sd", label: "Schematic" },
              { value: "dd", label: "Dev Design" },
              { value: "cn", label: "Construction" },
              { value: "ho", label: "Hand Over" },
            ]}
            onChange={() => { }}
            selectSize="sm"
            className="w-40"
          />
        </div>

        {/* View Options */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 mb-2 sm:mb-0">
            <span className="text-sm text-text-muted">Group by</span>
            <div className="w-[120px]">
              <Select
                selectSize="sm"
                variant="filled"
                value={groupBy}
                options={[
                  { label: "Status", value: "status" },
                  { label: "Stage", value: "stage" },
                ]}
                onChange={(v) => onChangeGroupBy(v as ProjectsGroupBy)}
              />
            </div>
          </div>

          <Tabs<ProjectsView>
            value={view}
            onChange={onChangeView}
            className="-mb-px"
            items={[
              { key: "list", label: "List" },
              { key: "board", label: "Board" },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
