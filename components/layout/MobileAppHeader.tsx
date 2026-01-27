"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { ChevronLeft, ChevronDown, LucideIcon } from "lucide-react";

export interface SiblingApp {
    id: string;
    label: string;
    href: string;
    icon: LucideIcon;
}

interface MobileAppHeaderProps {
    /** Current app name */
    appName: string;
    /** Icon for current app */
    appIcon: LucideIcon;
    /** Parent mode href (e.g., "/flow") */
    parentHref: string;
    /** Parent mode label (e.g., "Flow") */
    parentLabel: string;
    /** List of sibling apps for the switcher dropdown */
    siblingApps: SiblingApp[];
    /** Optional right-side actions */
    rightActions?: React.ReactNode;
    /** Theme color for accent */
    accentColor?: string;
}

/**
 * Mobile app header with Pumble-style pill buttons
 * Back button in separate pill, app name in larger pill with dropdown
 */
export default function MobileAppHeader({
    appName,
    appIcon: AppIcon,
    parentHref,
    parentLabel,
    siblingApps,
    rightActions,
    accentColor = "text-neutral-900",
}: MobileAppHeaderProps) {
    const pathname = usePathname();
    const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    // Close dropdown on outside click
    React.useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        if (isDropdownOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isDropdownOpen]);

    // Close dropdown on navigation
    React.useEffect(() => {
        setIsDropdownOpen(false);
    }, [pathname]);

    return (
        <div className="lg:hidden backdrop-blur-2xl backdrop-saturate-150"
            style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.75) 0%, rgba(250,250,252,0.65) 100%)' }}
        >
            <div className="flex items-center gap-2.5 px-4 py-3">
                {/* Pumble-style: Back button in its own glass pill */}
                <Link
                    href={parentHref}
                    className="flex items-center justify-center w-10 h-10 rounded-full backdrop-blur-xl border border-white/80 shadow-sm active:scale-95 transition-transform"
                    style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)' }}
                >
                    <ChevronLeft className="w-5 h-5 text-neutral-600" strokeWidth={2} />
                </Link>

                {/* App Switcher Pill - glass style like Pumble */}
                <div className="relative flex-1" ref={dropdownRef}>
                    <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className={clsx(
                            "flex items-center gap-2.5 px-4 py-2 rounded-full backdrop-blur-xl border border-white/80 shadow-sm transition-all active:scale-[0.98]",
                            isDropdownOpen && "border-neutral-300/60"
                        )}
                        style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)' }}
                    >
                        <AppIcon className={clsx("w-4 h-4", accentColor)} strokeWidth={2} />
                        <div className="flex flex-col items-start">
                            <span className="font-semibold text-neutral-900 text-sm leading-tight">{appName}</span>
                            <span className="text-[10px] text-neutral-400 leading-tight">{parentLabel}</span>
                        </div>
                        <ChevronDown
                            className={clsx(
                                "w-4 h-4 text-neutral-400 ml-1 transition-transform duration-200",
                                isDropdownOpen && "rotate-180"
                            )}
                        />
                    </button>

                    {/* Dropdown */}
                    {isDropdownOpen && (
                        <div
                            className="absolute top-full left-0 right-0 mt-2 backdrop-blur-2xl rounded-2xl border border-neutral-200/60 shadow-xl overflow-hidden"
                            style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(250,250,252,0.95) 100%)' }}
                        >
                            <div className="py-2">
                                {siblingApps.map((app) => {
                                    const Icon = app.icon;
                                    const isCurrentApp = pathname.startsWith(app.href);
                                    return (
                                        <Link
                                            key={app.id}
                                            href={app.href}
                                            className={clsx(
                                                "flex items-center gap-3 px-4 py-3 transition-colors",
                                                isCurrentApp
                                                    ? "bg-neutral-100"
                                                    : "hover:bg-neutral-50 active:bg-neutral-100"
                                            )}
                                        >
                                            <div className={clsx(
                                                "w-9 h-9 rounded-xl flex items-center justify-center",
                                                isCurrentApp
                                                    ? "bg-gradient-to-b from-rose-100 to-rose-50 border border-rose-200/60"
                                                    : "bg-neutral-100"
                                            )}>
                                                <Icon
                                                    className={clsx(
                                                        "w-4 h-4",
                                                        isCurrentApp ? "text-neutral-800" : "text-neutral-500"
                                                    )}
                                                    strokeWidth={2}
                                                />
                                            </div>
                                            <span className={clsx(
                                                "font-medium text-sm",
                                                isCurrentApp ? "text-neutral-900" : "text-neutral-600"
                                            )}>
                                                {app.label}
                                            </span>
                                            {isCurrentApp && (
                                                <span className="ml-auto text-[10px] text-neutral-400 font-medium">Current</span>
                                            )}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Actions */}
                {rightActions && (
                    <div className="flex items-center gap-2">
                        {rightActions}
                    </div>
                )}
            </div>
        </div>
    );
}
