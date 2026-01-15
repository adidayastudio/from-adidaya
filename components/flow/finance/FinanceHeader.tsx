"use client";

import { FinanceViewToggle } from "@/components/flow/finance/FinanceViewToggle";

interface FinanceHeaderProps {
    title: string;
    subtitle: string;
}

export default function FinanceHeader({ title, subtitle }: FinanceHeaderProps) {
    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-neutral-900">{title}</h1>
                    <p className="text-sm text-neutral-500 mt-1">{subtitle}</p>
                </div>
                <div className="self-start md:self-auto">
                    <FinanceViewToggle />
                </div>
            </div>
            <div className="border-b border-neutral-200" />
        </div>
    );
}
