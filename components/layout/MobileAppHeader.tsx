"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { ChevronLeft, ChevronDown, LucideIcon } from "lucide-react";
import { useTheme } from "next-themes";

export interface SiblingApp {
    id: string;
    label: string;
    href: string;
    icon: LucideIcon;
}

interface MobileAppHeaderProps {
    appName: string;
    appIcon: LucideIcon;
    parentHref: string;
    parentLabel: string;
    siblingApps: SiblingApp[];
    rightActions?: React.ReactNode;
    accentColor?: string;
}

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
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === "dark";
    const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

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

    React.useEffect(() => {
        setIsDropdownOpen(false);
    }, [pathname]);

    const headerBg = isDark
        ? 'linear-gradient(180deg, rgba(23,23,23,0.75) 0%, rgba(20,20,20,0.65) 100%)'
        : 'linear-gradient(180deg, rgba(255,255,255,0.75) 0%, rgba(250,250,252,0.65) 100%)';
    const pillBg = isDark
        ? 'linear-gradient(180deg, rgba(38,38,38,0.9) 0%, rgba(30,30,30,0.7) 100%)'
        : 'linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)';
    const dropdownBg = isDark
        ? 'linear-gradient(180deg, rgba(30,30,30,0.98) 0%, rgba(25,25,25,0.95) 100%)'
        : 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(250,250,252,0.95) 100%)';

    return (
        <div className="lg:hidden backdrop-blur-2xl backdrop-saturate-150"
            style={{ background: headerBg }}
        >
            <div className="flex items-center gap-2.5 px-4 py-3">
                <Link
                    href={parentHref}
                    className="flex items-center justify-center w-10 h-10 rounded-full backdrop-blur-xl border border-white/80 dark:border-neutral-700 shadow-sm active:scale-95 transition-transform"
                    style={{ background: pillBg }}
                >
                    <ChevronLeft className="w-5 h-5 text-neutral-600 dark:text-neutral-300" strokeWidth={2} />
                </Link>

                <div className="relative flex-1" ref={dropdownRef}>
                    <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className={clsx(
                            "flex items-center gap-2.5 px-4 py-2 rounded-full backdrop-blur-xl border border-white/80 dark:border-neutral-700 shadow-sm transition-all active:scale-[0.98]",
                            isDropdownOpen && "border-neutral-300/60 dark:border-neutral-600"
                        )}
                        style={{ background: pillBg }}
                    >
                        <AppIcon className={clsx("w-4 h-4", accentColor)} strokeWidth={2} />
                        <div className="flex flex-col items-start">
                            <span className="font-semibold text-neutral-900 dark:text-white text-sm leading-tight">{appName}</span>
                            <span className="text-[10px] text-neutral-400 dark:text-neutral-500 leading-tight">{parentLabel}</span>
                        </div>
                        <ChevronDown
                            className={clsx(
                                "w-4 h-4 text-neutral-400 dark:text-neutral-500 ml-1 transition-transform duration-200",
                                isDropdownOpen && "rotate-180"
                            )}
                        />
                    </button>

                    {isDropdownOpen && (
                        <div
                            className="absolute top-full left-0 right-0 mt-2 backdrop-blur-2xl rounded-2xl border border-neutral-200/60 dark:border-neutral-700 shadow-xl overflow-hidden z-50"
                            style={{ background: dropdownBg }}
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
                                                    ? "bg-neutral-100 dark:bg-neutral-800"
                                                    : "hover:bg-neutral-50 dark:hover:bg-neutral-800/60 active:bg-neutral-100"
                                            )}
                                        >
                                            <div className={clsx(
                                                "w-9 h-9 rounded-xl flex items-center justify-center",
                                                isCurrentApp
                                                    ? "bg-gradient-to-b from-rose-100 to-rose-50 dark:from-rose-500/20 dark:to-rose-500/10 border border-rose-200/60 dark:border-rose-500/20"
                                                    : "bg-neutral-100 dark:bg-neutral-800"
                                            )}>
                                                <Icon
                                                    className={clsx(
                                                        "w-4 h-4",
                                                        isCurrentApp ? "text-neutral-800 dark:text-white" : "text-neutral-500 dark:text-neutral-400"
                                                    )}
                                                    strokeWidth={2}
                                                />
                                            </div>
                                            <span className={clsx(
                                                "font-medium text-sm",
                                                isCurrentApp ? "text-neutral-900 dark:text-white" : "text-neutral-600 dark:text-neutral-400"
                                            )}>
                                                {app.label}
                                            </span>
                                            {isCurrentApp && (
                                                <span className="ml-auto text-[10px] text-neutral-400 dark:text-neutral-500 font-medium">Current</span>
                                            )}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {rightActions && (
                    <div className="flex items-center gap-2">
                        {rightActions}
                    </div>
                )}
            </div>
        </div>
    );
}
