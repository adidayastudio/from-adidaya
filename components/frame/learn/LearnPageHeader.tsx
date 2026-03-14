"use client";

import { ViewToggle } from "@/shared/ui/layout/ViewToggle";
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
  const typeOptions = getTypeOptions(activeQuickView || "all");

  return (
    <div className="space-y-6">
      {/* Premium Desktop Header */}
      <div className="hidden lg:block mb-0">
        <div className="flex items-center justify-between gap-4 pt-0">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white tracking-tight">
              Knowledge Center
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              Access SOPs, guidelines, templates, and organizational knowledge.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <Input
                value={searchQuery}
                onChange={e => onSearchChange(e.target.value)}
                placeholder="Search knowledge..."
                inputSize="sm"
                className="pl-9 w-64 rounded-full bg-white dark:bg-neutral-900/50 border-neutral-200 dark:border-neutral-800 focus:ring-black/5"
              />
            </div>

            {/* Add Knowledge */}
            <Button
              variant="primary"
              className="rounded-full h-9 px-4 text-[11px] font-bold uppercase tracking-wider shadow-md shadow-blue-500/20 active:scale-95 transition-all"
              onClick={onAddKnowledge}
              icon={<Plus className="w-4 h-4" />}
            >
              Add Knowledge
            </Button>
          </div>
        </div>
        <div className="border-b border-neutral-200 dark:border-neutral-800 mt-5" />
      </div>

      {/* Filters and Toggle Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Select
            value={selectedDepartment}
            options={DEPARTMENT_OPTIONS}
            onChange={(v) => onDepartmentChange(v as Department)}
            selectSize="sm"
            className="w-40 text-xs rounded-lg"
          />

          <Select
            value={selectedType}
            options={typeOptions}
            onChange={(v) => onTypeChange(v as KnowledgeType | "ALL")}
            selectSize="sm"
            className="w-40 text-xs rounded-lg"
          />
        </div>

        {/* View Toggle on Right */}
        <ViewToggle<LearnView>
          value={view}
          onChange={onChangeView}
          options={[
            { value: "list", label: "List View", icon: <List className="w-4 h-4" /> },
            { value: "grouped", label: "Grouped View", icon: <LayoutList className="w-4 h-4" /> },
          ]}
        />
      </div>
    </div>
  );
}
