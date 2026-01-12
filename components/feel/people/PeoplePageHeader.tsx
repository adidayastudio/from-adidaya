"use client";
import { Plus } from "lucide-react";


import { Search, List, LayoutList, SquareKanban, Calendar, ChartGantt } from "lucide-react";

import { Button } from "@/shared/ui/primitives/button/button";
import { ViewToggle } from "@/shared/ui/layout/ViewToggle";
import { Input } from "@/shared/ui/primitives/input/input";
import { Select } from "@/shared/ui/primitives/select/select";

export type PeopleView =
  | "list"
  | "grouped"
  | "board"
  | "calendar"
  | "timeline";

const VIEW_OPTIONS = [
  { value: "list" as PeopleView, label: "List", icon: <List className="w-4 h-4" /> },
  { value: "grouped" as PeopleView, label: "Grouped", icon: <LayoutList className="w-4 h-4" /> },
  { value: "board" as PeopleView, label: "Board", icon: <SquareKanban className="w-4 h-4" /> },
  { value: "calendar" as PeopleView, label: "Calendar", icon: <Calendar className="w-4 h-4" /> },
  { value: "timeline" as PeopleView, label: "Timeline", icon: <ChartGantt className="w-4 h-4" /> },
];

export default function PeoplePageHeader({
  view,
  onChangeView,
  onAddPerson,
  searchQuery = "",
  onSearchChange = () => { },
}: {
  view: PeopleView;
  onChangeView: (v: PeopleView) => void;
  onAddPerson: () => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Standard Header */}
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between border-b border-neutral-200 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">People</h1>
            <p className="text-sm text-neutral-500 mt-1">Directory of all employees, partners, and stakeholders.</p>
          </div>
          <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={onAddPerson}>
            Add Person
          </Button>
        </div>
      </div>

      {/* Toolbar: Filters & View Toggle */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        {/* Filters */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 group-focus-within:text-brand-red transition-colors" />
            <Input
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search people..."
              inputSize="sm"
              className="pl-9 w-64"
            />
          </div>

          <Select
            value="all"
            options={[
              { value: "all", label: "All Roles" },
              { value: "architect", label: "Architect" },
              { value: "interior-designer", label: "Interior Designer" },
              { value: "manager", label: "Manager" },
            ]}
            onChange={() => { }}
            selectSize="sm"
            className="w-40"
          />

          <Select
            value="all"
            options={[
              { value: "all", label: "All Status" },
              { value: "full-time", label: "Full Time" },
              { value: "freelance", label: "Freelance" },
              { value: "intern", label: "Intern" },
            ]}
            onChange={() => { }}
            selectSize="sm"
            className="w-36"
          />
        </div>

        {/* View Toggle */}
        <ViewToggle<PeopleView>
          value={view}
          onChange={onChangeView}
          options={VIEW_OPTIONS}
        />
      </div>
    </div>
  );
}
