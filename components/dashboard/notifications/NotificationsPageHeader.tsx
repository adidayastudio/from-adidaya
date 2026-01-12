"use client";

import { Tabs } from "@/shared/ui/layout/Tabs";
import { PageHeader } from "@/shared/ui/headers/PageHeader";
import clsx from "clsx";

export type NotificationsView =
  | "list"
  | "grouped"
  | "timeline";

export default function NotificationsPageHeader({
  view,
  onChangeView,
  onMarkAllRead,
}: {
  view: NotificationsView;
  onChangeView: (v: NotificationsView) => void;
  onMarkAllRead: () => void;
}) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <PageHeader title="Notifications" />

        <button
          onClick={onMarkAllRead}
          className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-800 transition hover:bg-neutral-100"
        >
          Mark all as read
        </button>
      </div>

      {/* View Options */}
      <Tabs<NotificationsView>
        value={view}
        onChange={onChangeView}
        items={[
          { key: "list", label: "List" },
          { key: "grouped", label: "Grouped" },
          { key: "timeline", label: "Timeline" },
        ]}
      />
    </div>
  );
}
