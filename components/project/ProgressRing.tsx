// components/project/ProgressRing.tsx
import React from 'react';

interface ProgressRingProps {
    progress: number;
    size?: number;
    strokeWidth?: number;
    color?: string;
}

export default function ProgressRing({ progress, size = 44, strokeWidth = 3.5, color: customColor }: ProgressRingProps) {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (progress / 100) * circumference;

    let color = customColor || "#0A84FF";
    let bgColor = customColor ? `${customColor}1A` : "rgba(10, 132, 255, 0.1)";

    if (!customColor) {
        if (progress < 40) {
            color = "#FF3B30";
            bgColor = "rgba(255, 59, 48, 0.1)";
        } else if (progress < 60) {
            color = "#FF9500";
            bgColor = "rgba(255, 149, 0, 0.1)";
        } else if (progress >= 80) {
            color = "#34C759";
            bgColor = "rgba(52, 199, 89, 0.1)";
        }
    } else {
        // If hex, try to make it transparent for bg
        if (customColor.startsWith('#') && customColor.length === 7) {
            bgColor = `${customColor}26`; // 15% opacity
        }
    }

    return (
        <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="transform -rotate-90">
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={bgColor}
                    strokeWidth={strokeWidth}
                    fill="none"
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={color}
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    className="transition-all duration-500 ease-in-out"
                />
            </svg>
            <span
                className="absolute text-xs font-bold"
                style={{ color, fontSize: size * 0.28 }}
            >
                {progress}%
            </span>
        </div>
    );
}
