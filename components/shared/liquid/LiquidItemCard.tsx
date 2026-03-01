import React from "react";
import clsx from "clsx";

export interface LiquidItemCardProps {
    title: React.ReactNode;
    subtitle?: React.ReactNode; // Can be a string, date, or complex element
    badges?: React.ReactNode[]; // Array of pill badges
    rightTop?: React.ReactNode; // Usually the amount/value
    rightBottom?: React.ReactNode; // Usually status
    leftAvatar?: React.ReactNode; // Optional circular avatar/icon
    onClick?: () => void;
    actions?: React.ReactNode; // E.g., Approve / Reject buttons
    className?: string; // Add any custom styling classes
}

export function LiquidItemCard({
    title,
    subtitle,
    badges = [],
    rightTop,
    rightBottom,
    leftAvatar,
    onClick,
    actions,
    className
}: LiquidItemCardProps) {

    return (
        <div
            onClick={actions ? undefined : onClick}
            className={clsx(
                "bg-white rounded-[20px] p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-neutral-100 flex flex-col gap-3",
                !actions && onClick && "active:scale-[0.98] transition-transform cursor-pointer hover:bg-neutral-50/50",
                className
            )}
        >
            <div className="flex items-start justify-between">

                {/* Left Section (Avatar + Title/Subtitle/Badges) */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                    {leftAvatar && (
                        <div className="shrink-0">
                            {leftAvatar}
                        </div>
                    )}

                    <div className="flex flex-col gap-1 min-w-0 pr-2">
                        <h3 className="text-[15px] font-bold text-neutral-900 tracking-tight leading-tight truncate">
                            {title}
                        </h3>

                        {(badges.length > 0 || subtitle) && (
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                {badges.map((badge, idx) => (
                                    <React.Fragment key={idx}>
                                        {badge}
                                    </React.Fragment>
                                ))}
                                {subtitle && (
                                    <span className="text-[12px] font-medium text-neutral-400">
                                        {subtitle}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Section (Value + Status) */}
                {(rightTop || rightBottom) && (
                    <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                        {rightTop && (
                            <div className="text-[15px] font-bold text-neutral-900 tracking-tight text-right">
                                {rightTop}
                            </div>
                        )}
                        {rightBottom && (
                            <div className="text-[11px] font-bold tracking-wide text-right">
                                {rightBottom}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Bottom Actions Section */}
            {actions && (
                <div className="flex items-center gap-2 mt-1">
                    {actions}
                </div>
            )}
        </div>
    );
}

// Helper to render default pills in the Liquid style
export function LiquidBadge({ children, className }: { children: React.ReactNode, className?: string }) {
    return (
        <span className={clsx(
            "px-1.5 py-0.5 rounded text-[10px] font-bold bg-neutral-100 text-neutral-400 uppercase tracking-wider border border-neutral-200/50",
            className
        )}>
            {children}
        </span>
    );
}
