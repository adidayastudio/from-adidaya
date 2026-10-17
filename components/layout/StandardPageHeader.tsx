"use client";

import React from "react";
import clsx from "clsx";

interface StandardPageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  hideDivider?: boolean;
  className?: string;
}

export default function StandardPageHeader({
  title,
  subtitle,
  action,
  hideDivider = true,
  className,
}: StandardPageHeaderProps) {
  return (
    <div className={clsx("mb-6", className)}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-0">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              {subtitle}
            </p>
          )}
        </div>
        {action && (
          <div className="flex items-center gap-3">
            {action}
          </div>
        )}
      </div>
      {!hideDivider && (
        <div className="border-b border-neutral-200 dark:border-neutral-800 mt-4" />
      )}
    </div>
  );
}
