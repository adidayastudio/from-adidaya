"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface ActivityRingProps {
    /** Percentage value (0-100) */
    percentage: number;
    /** Size of the ring in pixels */
    size?: number;
    /** Stroke width of the ring */
    strokeWidth?: number;
    /** Color string for the track (background) ring */
    trackColor?: string;
    /** Color string for the progress ring (if no gradient) */
    color?: string;
    /** Gradient stops for the progress ring. [startColor, endColor] */
    gradient?: [string, string];
    /** Icon to display in the center */
    icon?: LucideIcon;
    /** Color for the icon */
    iconColor?: string;
    /** Label to display below the icon (optional) */
    label?: string;
    /** Unique ID for gradient definition */
    id: string;
    /** ClassName for additional styling */
    className?: string;
    /** Hover handler */
    onHover?: () => void;
    /** Leave handler */
    onLeave?: () => void;
}

export function ActivityRing({
    percentage,
    size = 120,
    strokeWidth = 12,
    trackColor = "#E6EEFF",
    color = "#3A7AFE",
    gradient,
    icon: Icon,
    iconColor,
    label,
    id,
    className,
    onHover,
    onLeave
}: ActivityRingProps) {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;
    const clampedOffset = Math.max(0, offset);

    // Helper for interactive props
    const interactiveProps = onHover ? {
        onMouseEnter: onHover,
        onMouseLeave: onLeave,
        className: "cursor-pointer pointer-events-auto transition-opacity"
    } : {};

    return (
        <div className={cn("relative flex flex-col items-center justify-center pointer-events-none", className)} style={{ width: size, height: size }}>
            <svg
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
                className="transform -rotate-90 pointer-events-none"
            >
                {/* Gradient Definition */}
                {gradient && (
                    <defs>
                        <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor={gradient[0]} />
                            <stop offset="100%" stopColor={gradient[1]} />
                        </linearGradient>
                    </defs>
                )}

                {/* Track Ring */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={trackColor}
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeLinecap="round"
                    {...interactiveProps}
                />

                {/* Progress Ring */}
                <motion.circle
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: clampedOffset }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={gradient ? `url(#${id})` : color}
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeDasharray={circumference}
                    strokeLinecap="round"
                    className="drop-shadow-sm"
                    {...interactiveProps}
                />
            </svg>

            {/* Content (Icon/Label) */}
            <div
                className={cn("absolute inset-0 flex flex-col items-center justify-center", onHover ? "pointer-events-auto cursor-pointer" : "")}
                onMouseEnter={onHover}
                onMouseLeave={onLeave}
            >
                {Icon && (
                    <Icon
                        size={size * 0.35}
                        className={cn("mb-1", iconColor ? "" : "text-slate-700")}
                        style={{ color: iconColor }}
                    />
                )}
                {label && (
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">
                        {label}
                    </span>
                )}
            </div>
        </div>
    );
}
