"use client";
import { Plus, Search } from "lucide-react";

import { Tabs } from "@/shared/ui/layout/Tabs";
import { PageHeader } from "@/shared/ui/headers/PageHeader";

export type AssetView =
  | "list"
  | "grouped"
  | "board"
  | "calendar"
  | "timeline";

import { Button } from "@/shared/ui/primitives/button/button";
import { Input } from "@/shared/ui/primitives/input/input";
import { Select } from "@/shared/ui/primitives/select/select";

export default function AssetPageHeader({
  view,
  onChangeView,
  onAddAsset,
}: {
  view: AssetView;
  onChangeView: (v: AssetView) => void;
  onAddAsset: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <PageHeader
          title="Asset"
          description="Catalog and manage company assets, equipment, and inventory."
          actions={
            <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={onAddAsset}>
              Add Asset / Stock
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
              placeholder="Search assets..."
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
              { value: "concrete", label: "Concrete & Cement" },
              { value: "steel", label: "Steel" },
              { value: "finishing", label: "Finishing" },
              { value: "tools", label: "Tools & Equipment" },
            ]}
            onChange={() => { }}
            selectSize="sm"
            className="w-40"
          />

          <Select
            value="all-locations"
            options={[
              { value: "all-locations", label: "All Locations" },
              { value: "warehouse", label: "Warehouse" },
              { value: "site", label: "On Site" },
            ]}
            onChange={() => { }}
            selectSize="sm"
            className="w-32"
          />
        </div>

        {/* View Options */}
        <Tabs<AssetView>
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
