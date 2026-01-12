// shared/ui/headers/PageHeader.tsx
"use client";

import React from "react";
import Link from "next/link";
import clsx from "clsx";

type BreadcrumbItem = {
  label: string;
  href?: string;
};

type PageHeaderProps = {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
};

/**
 * PageHeader - Unified page header with optional breadcrumbs
 * 
 * Features:
 * - Optional breadcrumb navigation
 * - Title with optional description and meta info
 * - Action buttons area
 * - Premium styling with subtle borders
 */
export function PageHeader({
  title,
  description,
  breadcrumbs,
  meta,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={clsx("space-y-3", className)}>
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav
          className="flex items-center gap-1.5 text-sm"
          aria-label="Breadcrumb"
        >
          {breadcrumbs.map((item, index) => {
            const isLast = index === breadcrumbs.length - 1;

            return (
              <React.Fragment key={index}>
                {item.href && !isLast ? (
                  <Link
                    href={item.href}
                    className="text-neutral-500 hover:text-neutral-800 transition-colors"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span
                    className={clsx(
                      isLast
                        ? "text-neutral-900 font-medium"
                        : "text-neutral-500"
                    )}
                  >
                    {item.label}
                  </span>
                )}

                {!isLast && (
                  <span className="text-neutral-300 select-none">|</span>
                )}
              </React.Fragment>
            );
          })}
        </nav>
      )}

      {/* Header Row */}
      <div className="flex items-start justify-between gap-4 border-b border-neutral-200 pb-4">
        {/* LEFT */}
        <div className="min-w-0">
          <h1 className="text-lg font-semibold text-neutral-900 truncate">
            {title}
          </h1>

          {description && (
            <p className="mt-1 text-sm text-neutral-500 leading-relaxed">
              {description}
            </p>
          )}

          {meta && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-sm text-neutral-500">
              {meta}
            </div>
          )}
        </div>

        {/* RIGHT */}
        {actions && (
          <div className="flex shrink-0 items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Breadcrumb - Standalone breadcrumb component for pages that don't use PageHeader
 */
export function Breadcrumb({
  items,
  className,
}: {
  items: BreadcrumbItem[];
  className?: string;
}) {
  return (
    <nav
      className={clsx("flex items-center gap-1.5 text-sm mb-4", className)}
      aria-label="Breadcrumb"
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <React.Fragment key={index}>
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="text-neutral-500 hover:text-neutral-800 transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={clsx(
                  isLast
                    ? "text-neutral-900 font-medium"
                    : "text-neutral-500"
                )}
              >
                {item.label}
              </span>
            )}

            {!isLast && (
              <span className="text-neutral-300 select-none">|</span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
