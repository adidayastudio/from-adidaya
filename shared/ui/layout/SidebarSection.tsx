"use client";

import React from "react";

type SidebarSectionProps = {
  title: string;
  children: React.ReactNode;
};

export function SidebarSection({ title, children }: SidebarSectionProps) {
  return (
    <div className="space-y-2">
      <p className="px-3 text-xs font-medium uppercase tracking-wide text-neutral-400">
        {title}
      </p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}
