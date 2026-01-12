"use client";

import { Tabs } from "@/shared/ui/layout/Tabs";
import { PageHeader } from "@/shared/ui/headers/PageHeader";
import clsx from "clsx";

export type MyProjectsView =
  | "list"
  | "grouped"
  | "board"
  | "calendar"
  | "timeline";

export default function MyProjectsPageHeader({
  view,
  onChangeView,
}: {
  view: MyProjectsView;
  onChangeView: (v: MyProjectsView) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="space-y-1">
        <PageHeader title="My Projects" />
      </div>

      {/* View Options */}
      <Tabs<MyProjectsView>
        value={view}
        onChange={onChangeView}
        items={[
          { key: "list", label: "List" },
          { key: "grouped", label: "Grouped" },
          { key: "board", label: "Board" },
          { key: "calendar", label: "Calendar" },
          { key: "timeline", label: "Timeline" },
        ]}
      />
    </div>
  );
}
