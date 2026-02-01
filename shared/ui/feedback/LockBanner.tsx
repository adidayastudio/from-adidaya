"use client";

import { Lock, Info, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";

interface LockBannerProps {
    domain: string;
    subDomain: string;
    className?: string;
}

export default function LockBanner({ domain, subDomain, className }: LockBannerProps) {
    const router = useRouter();

    const goToDataControl = () => {
        const params = new URLSearchParams(window.location.search);
        params.set("tab", "data");
        params.set("subtab", "protection");
        router.push(`${window.location.pathname}?${params.toString()}`);
    };

    return (
        <div className={clsx(
            "bg-red-50/80 backdrop-blur-sm border border-red-100 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-300 shadow-sm",
            className
        )}>
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                    <Lock className="w-4 h-4 text-red-600 fill-red-600/10" />
                </div>
                <div>
                    <h5 className="text-xs font-bold text-red-900 uppercase tracking-tight">Governance Lock Active</h5>
                    <p className="text-[11px] text-red-800/80 leading-snug">
                        The <strong>{subDomain}</strong> domain is currently locked via System Governance.
                        Modification and lifecycle actions are disabled.
                    </p>
                </div>
            </div>

            <button
                onClick={goToDataControl}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/50 hover:bg-white border border-red-200 rounded-lg text-[10px] font-bold text-red-700 transition-all active:scale-95 shadow-sm"
            >
                <ExternalLink className="w-3 h-3" />
                Go to Data Control
            </button>
        </div>
    );
}
