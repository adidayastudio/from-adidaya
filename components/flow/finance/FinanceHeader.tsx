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
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-neutral-900">{title}</h1>
                    <p className="text-sm text-neutral-500 mt-1">{subtitle}</p>
                </div>
                <div className="flex items-center gap-3 self-start md:self-auto">
                    {action}
                    {!hideToggle && <FinanceViewToggle />}
                </div>
            </div>
            <div className="border-b border-neutral-200" />
        </div>
    );
}
