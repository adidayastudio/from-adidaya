"use client";
import { Plus, Search } from "lucide-react";

import { Tabs } from "@/shared/ui/layout/Tabs";
import { PageHeader } from "@/shared/ui/headers/PageHeader";

export type ExpenseView =
  | "list"
  | "grouped"
  | "board"
  | "calendar"
  | "timeline";

import { Button } from "@/shared/ui/primitives/button/button";
import { Input } from "@/shared/ui/primitives/input/input";
import { Select } from "@/shared/ui/primitives/select/select";

export default function ExpensePageHeader({
  view,
  onChangeView,
  onAddExpense,
}: {
  view: ExpenseView;
  onChangeView: (v: ExpenseView) => void;
  onAddExpense: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <PageHeader
          title="Expense"
          description="Monitor operational costs and project-related expenses."
          actions={
            <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={onAddExpense}>
              Add Expense
            </Button>
          }
        />
      </div>

      {/* Toolbar: Filters & View Switcher */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-4 border-b border-neutral-200 pb-0">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 pb-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 group-focus-within:text-brand-red transition-colors" />
            <Input
              placeholder="Search expenses..."
              inputSize="sm"
              className="pl-9 w-60"
            />
          </div>

          <Select
            value="all-projects"
            options={[
              { value: "all-projects", label: "All Projects" },
              { value: "gym", label: "Precision Gym" },
              { value: "padel", label: "Padel JPF" },
            ]}
            onChange={() => { }}
            selectSize="sm"
            className="w-40"
          />

          <Select
            value="all-categories"
            options={[
              { value: "all-categories", label: "All Categories" },
              { value: "transport", label: "Transport" },
              { value: "meals", label: "Meals" },
              { value: "material", label: "Material" },
            ]}
            onChange={() => { }}
            selectSize="sm"
            className="w-40"
          />

          <Select
            value="this-week"
            options={[
              { value: "this-week", label: "This Week" },
              { value: "this-month", label: "This Month" },
              { value: "last-month", label: "Last Month" },
            ]}
            onChange={() => { }}
            selectSize="sm"
            className="w-32"
          />
        </div>

        {/* View Options */}
        <Tabs<ExpenseView>
          value={view}
          onChange={onChangeView}
          className="-mb-px"
          items={[
            { key: "list", label: "List" },
            { key: "grouped", label: "Grouped" },
            { key: "board", label: "Board" },
            { key: "calendar", label: "Calendar" },
            { key: "timeline", label: "Timeline" },
          ]}
        />
      </div>
    </div>
  );
}
