"use client";

import React from "react";
import clsx from "clsx";
import { LucideIcon, FolderOpen } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button/button";

type EmptyStateProps = {
    icon?: LucideIcon;
    title: string;
    description?: string;
    action?: {
        label: string;
        onClick: () => void;
    };
    className?: string;
};

/**
 * EmptyState - Premium empty state component for lists, tables, and search results
 * 
 * Features:
 * - Subtle gradient background
 * - Smooth icon animation on hover
 * - Optional action button
 * - Consistent spacing and typography
 */
export function EmptyState({
    icon: Icon = FolderOpen,
    title,
    description,
    action,
    className,
}: EmptyStateProps) {
    return (
        <div
            className={clsx(
                "flex flex-col items-center justify-center py-16 px-6",
                "rounded-xl border border-dashed border-neutral-200",
                "bg-gradient-to-b from-neutral-50/50 to-white",
                "transition-all duration-300",
                className
            )}
        >
            {/* Icon Container */}
            <div
                className={clsx(
                    "mb-4 flex h-16 w-16 items-center justify-center",
                    "rounded-2xl bg-neutral-100/80 backdrop-blur-sm",
                    "ring-1 ring-neutral-200/50",
                    "transition-transform duration-300 hover:scale-105"
                )}
            >
                <Icon
                    size={28}
                    strokeWidth={1.5}
                    className="text-neutral-400"
                />
            </div>

            {/* Title */}
            <h3 className="text-base font-semibold text-neutral-800 text-center">
                {title}
            </h3>

            {/* Description */}
            {description && (
                <p className="mt-1.5 text-sm text-neutral-500 text-center max-w-xs">
                    {description}
                </p>
            )}

            {/* Action Button */}
            {action && (
                <div className="mt-5">
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={action.onClick}
                    >
                        {action.label}
                    </Button>
                </div>
            )}
        </div>
    );
}

/**
 * EmptyStateCompact - Smaller variant for inline use in tables/lists
 */
export function EmptyStateCompact({
    icon: Icon = FolderOpen,
    message,
    className,
}: {
    icon?: LucideIcon;
    message: string;
    className?: string;
}) {
    return (
        <div
            className={clsx(
                "flex items-center justify-center gap-3 py-8 px-4",
                "text-neutral-400",
                className
            )}
        >
            <Icon size={18} strokeWidth={1.5} />
            <span className="text-sm">{message}</span>
        </div>
    );
}
