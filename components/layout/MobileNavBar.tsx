"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import clsx from "clsx";
import { ChevronLeft, ChevronDown, LucideIcon } from "lucide-react";
import { PillTab } from "./MobilePillTabs";
import { SiblingApp } from "./MobileAppHeader";

interface MobileNavBarProps {
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
    /** Sub-section tabs */
    tabs: PillTab[];
    /** Theme color for accent */
    accentColor?: string;
}

/**
 * Single-row liquid glass navigation bar
 * Layout: [Back] [Switcher] | [Pills...]
 * iOS-style with sliding indicator animation
 */
export default function MobileNavBar({
    appName,
    appIcon: AppIcon,
    parentHref,
    parentLabel,
    siblingApps,
    tabs,
    accentColor = "text-neutral-900",
}: MobileNavBarProps) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const currentUrl = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '');

    // Derive background/border colors from accentColor
    const getColorClasses = () => {
        if (accentColor?.includes('red')) {
            return { bg: 'bg-red-50/80', bgIcon: 'bg-red-100', border: 'border-red-200/60', text: 'text-red-600', tabText: 'text-red-700', indicator: 'bg-red-100/80 border-red-200/40' };
        } else if (accentColor?.includes('blue')) {
            return { bg: 'bg-blue-50/80', bgIcon: 'bg-blue-100', border: 'border-blue-200/60', text: 'text-blue-600', tabText: 'text-blue-700', indicator: 'bg-blue-100/80 border-blue-200/40' };
        } else if (accentColor?.includes('orange')) {
            return { bg: 'bg-orange-50/80', bgIcon: 'bg-orange-100', border: 'border-orange-200/60', text: 'text-orange-600', tabText: 'text-orange-700', indicator: 'bg-orange-100/80 border-orange-200/40' };
        }
        return { bg: 'bg-neutral-50/80', bgIcon: 'bg-neutral-100', border: 'border-neutral-200/60', text: 'text-neutral-600', tabText: 'text-neutral-700', indicator: 'bg-neutral-100/80 border-neutral-200/40' };
    };
    const colors = getColorClasses();
    const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
    const dropdownRef = React.useRef<HTMLDivElement>(null);
    const pillsRef = React.useRef<HTMLDivElement>(null);
    const pillRefs = React.useRef<Map<string, HTMLAnchorElement>>(new Map());
    const [indicatorStyle, setIndicatorStyle] = React.useState({ left: 0, width: 0 });

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

    const isActiveTab = (href: string) => {
        // Parse the href to get path and query params
        const [hrefPath, hrefQuery] = href.split('?');

        // If href has query params, check if they match current URL
        if (hrefQuery) {
            // Check if current URL starts with hrefPath and contains the query param
            if (pathname === hrefPath || pathname.startsWith(hrefPath + '/')) {
                const hrefParams = new URLSearchParams(hrefQuery);
                for (const [key, value] of hrefParams.entries()) {
                    if (searchParams.get(key) === value) return true;
                }
            }
            return false;
        }

        // For href without query params, it's active if pathname matches and no relevant query params
        if (pathname === hrefPath) {
            // Check if there are no view/section params (base page)
            if (!searchParams.get('view') && !searchParams.get('section') && !searchParams.get('ai')) {
                return true;
            }
        }
        if (hrefPath.split("/").length > 3 && pathname.startsWith(hrefPath)) return true;
        return false;
    };

    // Find active tab
    const activeTab = tabs.find(tab => isActiveTab(tab.href));

    // Update indicator position and scroll to active pill
    React.useEffect(() => {
        if (activeTab && pillsRef.current) {
            const activeEl = pillRefs.current.get(activeTab.id);
            if (activeEl) {
                const container = pillsRef.current;

                // Update sliding indicator position
                setIndicatorStyle({
                    left: activeEl.offsetLeft,
                    width: activeEl.offsetWidth,
                });

                // Scroll to make active pill visible (start from left, not centered)
                const scrollTo = Math.max(0, activeEl.offsetLeft - 8);
                container.scrollTo({ left: scrollTo, behavior: "smooth" });
            }
        }
    }, [pathname, activeTab]);

    // Initial indicator position
    React.useEffect(() => {
        const timer = setTimeout(() => {
            if (activeTab) {
                const activeEl = pillRefs.current.get(activeTab.id);
                if (activeEl) {
                    setIndicatorStyle({
                        left: activeEl.offsetLeft,
                        width: activeEl.offsetWidth,
                    });
                }
            }
        }, 100);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="lg:hidden fixed top-0 left-0 right-0 z-40 px-3 pt-3 pb-2">
            {/* Main liquid glass container - fully rounded, subtle bg */}
            <div
                className="flex items-center gap-2 p-1.5 rounded-full backdrop-blur-2xl backdrop-saturate-150 border border-white/50"
                style={{
                    background: 'rgba(255,255,255,0.6)',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.6)'
                }}
            >
                {/* Left Group: Back + Switcher */}
                <div className="flex items-center gap-1 shrink-0" ref={dropdownRef}>
                    {/* Back button - circular */}
                    <Link
                        href={parentHref}
                        className="flex items-center justify-center w-8 h-8 rounded-full bg-white/60 border border-white/70 active:scale-95 transition-transform"
                    >
                        <ChevronLeft className="w-4 h-4 text-neutral-600" strokeWidth={2.5} />
                    </Link>

                    {/* App Switcher - compact rounded pill */}
                    <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className={clsx(
                            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/60 border border-white/70 transition-all active:scale-[0.98]",
                            isDropdownOpen && "bg-white/80"
                        )}
                    >
                        <AppIcon className={clsx("w-3.5 h-3.5", accentColor)} strokeWidth={2} />
                        <span className="font-semibold text-neutral-900 text-xs">{appName}</span>
                        <ChevronDown
                            className={clsx(
                                "w-3 h-3 text-neutral-400 transition-transform duration-200",
                                isDropdownOpen && "rotate-180"
                            )}
                        />
                    </button>

                    {/* Dropdown */}
                    {isDropdownOpen && (
                        <div
                            className="absolute top-full left-3 mt-2 w-52 backdrop-blur-2xl rounded-2xl border border-white/60 shadow-xl overflow-hidden"
                            style={{
                                background: 'rgba(255,255,255,0.92)',
                                boxShadow: '0 8px 40px rgba(0,0,0,0.1)'
                            }}
                        >
                            <div className="py-1.5">
                                <div className="px-3 py-1 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                                    {parentLabel} Apps
                                </div>
                                {siblingApps.map((app) => {
                                    const Icon = app.icon;
                                    const isCurrentApp = pathname.startsWith(app.href);
                                    return (
                                        <Link
                                            key={app.id}
                                            href={app.href}
                                            className={clsx(
                                                "flex items-center gap-2.5 px-3 py-2 transition-colors",
                                                isCurrentApp
                                                    ? colors.bg
                                                    : "hover:bg-neutral-50 active:bg-neutral-100"
                                            )}
                                        >
                                            <div className={clsx(
                                                "w-7 h-7 rounded-lg flex items-center justify-center",
                                                isCurrentApp
                                                    ? `${colors.bgIcon} border ${colors.border}`
                                                    : "bg-neutral-100"
                                            )}>
                                                <Icon
                                                    className={clsx(
                                                        "w-3.5 h-3.5",
                                                        isCurrentApp ? colors.text : "text-neutral-500"
                                                    )}
                                                    strokeWidth={2}
                                                />
                                            </div>
                                            <span className={clsx(
                                                "font-medium text-xs",
                                                isCurrentApp ? "text-neutral-900" : "text-neutral-600"
                                            )}>
                                                {app.label}
                                            </span>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Divider - subtle */}
                <div className="w-px h-5 bg-neutral-300/40 shrink-0" />

                {/* Right: Scrollable pills with sliding indicator */}
                <div
                    ref={pillsRef}
                    className="flex-1 overflow-x-auto scrollbar-hide relative"
                    style={{ WebkitOverflowScrolling: "touch" }}
                >
                    {/* Sliding indicator - liquid glass effect */}
                    <div
                        className={`absolute top-0 bottom-0 rounded-full ${colors.indicator} border transition-all duration-300 ease-out`}
                        style={{
                            left: indicatorStyle.left,
                            width: indicatorStyle.width,
                            opacity: indicatorStyle.width > 0 ? 1 : 0,
                        }}
                    />

                    <div className="flex gap-0.5 w-max relative z-10">
                        {tabs.map((tab) => {
                            const active = isActiveTab(tab.href);
                            return (
                                <Link
                                    key={tab.id}
                                    href={tab.href}
                                    ref={(el) => {
                                        if (el) pillRefs.current.set(tab.id, el);
                                    }}
                                    className={clsx(
                                        "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors duration-200 active:scale-95",
                                        active
                                            ? colors.tabText
                                            : "text-neutral-500 hover:text-neutral-700"
                                    )}
                                >
                                    {tab.label}
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
