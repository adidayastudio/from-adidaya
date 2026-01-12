"use client";
import { Plus, Search } from "lucide-react";

import { Tabs } from "@/shared/ui/layout/Tabs";
import { PageHeader } from "@/shared/ui/headers/PageHeader";

export type ClientView =
  | "list"
  | "grid";

import { Button } from "@/shared/ui/primitives/button/button";
import { Input } from "@/shared/ui/primitives/input/input";
import { Select } from "@/shared/ui/primitives/select/select";

export default function ClientPageHeader({
  view,
  onChangeView,
  onCreateLink,
}: {
  view: ClientView;
  onChangeView: (v: ClientView) => void;
  onCreateLink: () => void;
}) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Client Links"
        description="Manage external approval links for designs, RAB, and progress reports."
        actions={
          <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={onCreateLink}>
            Create Link
          </Button>
        }
      />

      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-4 border-b border-neutral-200 pb-0">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 pb-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 group-focus-within:text-brand-red transition-colors" />
            <Input
              placeholder="Search links..."
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
            value="all-types"
            options={[
              { value: "all-types", label: "All Types" },
              { value: "design", label: "Design" },
              { value: "rab", label: "RAB" },
              { value: "material", label: "Material" },
              { value: "progress", label: "Progress" },
            ]}
            onChange={() => { }}
            selectSize="sm"
            className="w-32"
          />

          <Select
            value="all-access"
            options={[
              { value: "all-access", label: "All Access" },
              { value: "public", label: "Public" },
              { value: "pin", label: "PIN Protected" },
            ]}
            onChange={() => { }}
            selectSize="sm"
            className="w-32"
          />
        </div>

        <Tabs<ClientView>
          value={view}
          onChange={onChangeView}
          className="-mb-px"
          items={[
            { key: "list", label: "List" },
            { key: "grid", label: "Grid" },
          ]}
        />
      </div>
    </div>
  );
}
