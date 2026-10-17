"use client";

import { FinanceViewToggle } from "@/components/flow/finance/FinanceViewToggle";

interface FinanceHeaderProps {
    title: string;
    subtitle: string;
    action?: React.ReactNode;
    hideToggle?: boolean;
}

export default function FinanceHeader({ title, subtitle, action, hideToggle }: FinanceHeaderProps) {
    return (
        <div>
            {/* Mobile: Compact title only, no divider */}
            <div className="md:hidden">
                <h1 className="text-[19px] font-bold text-neutral-900 dark:text-white tracking-tight">{title}</h1>
                <p className="text-xs text-neutral-400 mt-0.5">{subtitle}</p>
            </div>

            {/* Desktop: Full layout */}
            <div className="hidden md:flex items-start justify-between gap-4">
                {/* LEFT */}
                <div className="flex items-start gap-3 min-w-0">
                    <div className="min-w-0">
                        <h1 className="text-lg md:text-2xl font-bold text-neutral-900 dark:text-white truncate">
                            {title}
                        </h1>
                        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
                            {subtitle}
                        </p>
                    </div>
                </div>

                {/* RIGHT */}
                <div className="flex shrink-0 items-center gap-2">
                    {action}
                    <div className="md:hidden">
                        {!hideToggle && <FinanceViewToggle />}
                    </div>
                </div>
            </div>
        </div>
    );
}


