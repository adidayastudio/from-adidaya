"use client";

import React from "react";
import { LucideIcon } from "lucide-react";
import MobileAppHeader, { SiblingApp } from "./MobileAppHeader";
import MobilePillTabs, { PillTab } from "./MobilePillTabs";

interface MobileAppLayoutProps {
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
    /** Sub-section tabs for this app */
    tabs: PillTab[];
    /** Theme accent color */
    accentColor?: string;
    /** Optional right-side header actions */
    headerActions?: React.ReactNode;
    /** Page content */
    children: React.ReactNode;
}

/**
 * Complete mobile app layout with header, pill tabs, and content area
 * Combines MobileAppHeader + MobilePillTabs for consistent Level 2+3 navigation
 */
export default function MobileAppLayout({
    appName,
    appIcon,
    parentHref,
    parentLabel,
    siblingApps,
    tabs,
    accentColor,
    headerActions,
    children,
}: MobileAppLayoutProps) {
    return (
        <div className="lg:hidden min-h-screen bg-neutral-100">
            {/* Level 2: App Header with Switcher */}
            <MobileAppHeader
                appName={appName}
                appIcon={appIcon}
                parentHref={parentHref}
                parentLabel={parentLabel}
                siblingApps={siblingApps}
                accentColor={accentColor}
                rightActions={headerActions}
            />

            {/* Level 3: Sub-section Pill Tabs */}
            {tabs.length > 0 && (
                <div className="sticky top-[52px] z-30 bg-white/80 backdrop-blur-lg border-b border-neutral-100">
                    <MobilePillTabs tabs={tabs} />
                </div>
            )}

            {/* Content Area */}
            <div className="pb-32">
                {children}
            </div>
        </div>
    );
}
