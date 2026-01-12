"use client";

import { ViewToggle } from "@/shared/ui/layout/ViewToggle";
import { PageHeader } from "@/shared/ui/headers/PageHeader";
import { Button } from "@/shared/ui/primitives/button/button";
import { Input } from "@/shared/ui/primitives/input/input";
import { Select } from "@/shared/ui/primitives/select/select";
import { Search, Plus, List, LayoutList } from "lucide-react";
import { Department, KnowledgeType, QuickView, DEPARTMENT_OPTIONS, getTypeOptions } from "./types";

export type LearnView = "list" | "grouped";

type Props = {
  view: LearnView;
  onChangeView: (v: LearnView) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onAddKnowledge: () => void;
  selectedDepartment: Department;
  onDepartmentChange: (dept: Department) => void;
  selectedType: KnowledgeType | "ALL";
  onTypeChange: (type: KnowledgeType | "ALL") => void;
  activeQuickView: QuickView;
};

export default function LearnPageHeader({
  view,
  onChangeView,
  searchQuery,
  onSearchChange,
  onAddKnowledge,
  selectedDepartment,
  onDepartmentChange,
  selectedType,
  onTypeChange,
  activeQuickView
}: Props) {
  // Ensure we have valid options even if activeQuickView is undefined initially
  const typeOptions = getTypeOptions(activeQuickView || "all");

  return (
    <div className="space-y-4">
      <PageHeader
        title="Learn"
        description="Access SOPs, guidelines, templates, and organizational knowledge."
        actions={
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <Input
                value={searchQuery}
                onChange={e => onSearchChange(e.target.value)}
                placeholder="Search knowledge..."
                inputSize="sm"
                className="pl-9 w-64"
              />
            </div>

            {/* Add Knowledge */}
            <Button
              variant="primary"
              size="sm"
              onClick={onAddKnowledge}
              icon={<Plus className="w-4 h-4" />}
            >
              Add Knowledge
            </Button>
          </div>
        }
      />

      <div className="flex justify-between items-center">
        {/* Filters on Left */}
        <div className="flex items-center gap-3">
          <Select
            value={selectedDepartment}
            options={DEPARTMENT_OPTIONS}
            onChange={(v) => onDepartmentChange(v as Department)}
            selectSize="sm"
            className="w-40 text-xs"
          />

          <Select
            value={selectedType}
            options={typeOptions}
            onChange={(v) => onTypeChange(v as KnowledgeType | "ALL")}
            selectSize="sm"
            className="w-40 text-xs"
          />
        </div>

        {/* View Toggle on Right */}
        <ViewToggle<LearnView>
          value={view}
          onChange={onChangeView}
          options={[
            { value: "list", label: "List", icon: <List className="w-4 h-4" /> },
            { value: "grouped", label: "Grouped", icon: <LayoutList className="w-4 h-4" /> },
          ]}
        />
      </div>
    </div>
  );
}
