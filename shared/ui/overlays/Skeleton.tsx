"use client";

import React from "react";
import clsx from "clsx";

/**
 * Premium Skeleton components with smooth shimmer animation
 * 
 * Variants:
 * - Skeleton: Base rectangular skeleton
 * - SkeletonText: Line of text placeholder
 * - SkeletonCard: Card-shaped placeholder
 * - SkeletonAvatar: Circular avatar placeholder
 * - SkeletonTable: Table rows placeholder
 */

type SkeletonProps = {
    className?: string;
    animate?: boolean;
};

/**
 * Base Skeleton component with shimmer animation
 */
export function Skeleton({ className, animate = true }: SkeletonProps) {
    return (
        <div
            className={clsx(
                "rounded-lg bg-neutral-200/70",
                animate && "animate-pulse",
                className
            )}
        />
    );
}

/**
 * Text line skeleton
 */
export function SkeletonText({
    lines = 1,
    className,
}: {
    lines?: number;
    className?: string;
}) {
    return (
        <div className={clsx("space-y-2.5", className)}>
            {Array.from({ length: lines }).map((_, i) => (
                <Skeleton
                    key={i}
                    className={clsx(
                        "h-4",
                        // Vary widths for natural look
                        i === lines - 1 && lines > 1 ? "w-3/4" : "w-full"
                    )}
                />
            ))}
        </div>
    );
}

/**
 * Card skeleton with header and content
 */
export function SkeletonCard({ className }: { className?: string }) {
    return (
        <div
            className={clsx(
                "rounded-xl border border-neutral-200 bg-white p-5",
                "shadow-sm",
                className
            )}
        >
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                </div>
            </div>

            {/* Content */}
            <SkeletonText lines={3} />

            {/* Footer */}
            <div className="flex gap-2 mt-4">
                <Skeleton className="h-8 w-20 rounded-full" />
                <Skeleton className="h-8 w-20 rounded-full" />
            </div>
        </div>
    );
}

/**
 * Avatar skeleton
 */
export function SkeletonAvatar({
    size = "md",
    className,
}: {
    size?: "sm" | "md" | "lg";
    className?: string;
}) {
    const sizes = {
        sm: "h-8 w-8",
        md: "h-10 w-10",
        lg: "h-14 w-14",
    };

    return (
        <Skeleton className={clsx("rounded-full", sizes[size], className)} />
    );
}

/**
 * Table row skeleton
 */
export function SkeletonTableRow({
    columns = 5,
    className,
}: {
    columns?: number;
    className?: string;
}) {
    return (
        <div
            className={clsx(
                "flex items-center gap-4 py-3 px-4",
                "border-b border-neutral-100",
                className
            )}
        >
            {Array.from({ length: columns }).map((_, i) => (
                <Skeleton
                    key={i}
                    className={clsx(
                        "h-4",
                        i === 0 ? "w-16" : i === 1 ? "w-24" : "flex-1"
                    )}
                />
            ))}
        </div>
    );
}

/**
 * Table skeleton - multiple rows
 */
export function SkeletonTable({
    rows = 5,
    columns = 5,
    className,
}: {
    rows?: number;
    columns?: number;
    className?: string;
}) {
    return (
        <div
            className={clsx(
                "rounded-lg border border-neutral-200 bg-white overflow-hidden",
                className
            )}
        >
            {/* Header */}
            <div className="flex items-center gap-4 py-3 px-4 bg-neutral-50 border-b border-neutral-200">
                {Array.from({ length: columns }).map((_, i) => (
                    <Skeleton
                        key={i}
                        className={clsx(
                            "h-3",
                            i === 0 ? "w-12" : i === 1 ? "w-20" : "flex-1"
                        )}
                    />
                ))}
            </div>

            {/* Rows */}
            {Array.from({ length: rows }).map((_, i) => (
                <SkeletonTableRow key={i} columns={columns} />
            ))}
        </div>
    );
}

/**
 * Page header skeleton
 */
export function SkeletonPageHeader({ className }: { className?: string }) {
    return (
        <div className={clsx("flex items-start justify-between gap-4 pb-4", className)}>
            <div className="space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-10 w-28 rounded-full" />
        </div>
    );
}
