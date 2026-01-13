"use client";

import { useFinance } from "@/components/flow/finance/FinanceContext";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { User, Users } from "lucide-react";
import clsx from "clsx";

interface FinanceHeaderProps {
    title: string;
    subtitle: string;
    breadcrumbItems?: { label: string; href?: string }[]; // Optional/Deprecated
}

export default function FinanceHeader({ title, subtitle, breadcrumbItems }: FinanceHeaderProps) {
    const { viewMode, setViewMode } = useFinance();

    return (
        <div className="space-y-4">


            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-neutral-900">{title}</h1>
                    <p className="text-sm text-neutral-500 mt-1">{subtitle}</p>
                </div>

                <div className="flex items-center bg-neutral-100 rounded-full p-1 self-start md:self-auto">
                    <button
                        onClick={() => setViewMode("personal")}
                        className={clsx(
                            "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
                            viewMode === "personal" ? "bg-white shadow text-neutral-900" : "text-neutral-500 hover:text-neutral-700"
                        )}
                    >
                        <User className="w-4 h-4" /> Personal
                    </button>
                    <button
                        onClick={() => setViewMode("team")}
                        className={clsx(
                            "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
                            viewMode === "team" ? "bg-white shadow text-neutral-900" : "text-neutral-500 hover:text-neutral-700"
                        )}
                    >
                        <Users className="w-4 h-4" /> Team
                    </button>
                </div>
            </div>
            <div className="border-b border-neutral-200" />
        </div>
    );
}
