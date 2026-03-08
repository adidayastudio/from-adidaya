"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Flame, Zap, ShieldAlert, Activity, Hammer, Compass, Wind, PauseCircle, AlertTriangle, LucideIcon } from "lucide-react";
import { PERSONAS, Persona, resolveWorkPersona, WorkMetrics } from "@/lib/workPersonaLogic";
import { useVibePersona } from "@/hooks/useVibePersona";

const ICON_MAP: Record<string, LucideIcon> = {
    Zap,
    ShieldAlert,
    Activity,
    Hammer,
    Compass,
    Wind,
    PauseCircle,
    AlertTriangle,
};

export default function VibeCard() {
    const { persona, loading } = useVibePersona();

    if (loading) {
        return (
            <div className="mx-4 mt-4 h-[180px] rounded-[32px] bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
        );
    }

    const Icon = ICON_MAP[persona.icon] || Flame;

    return (
        <Link href="/dashboard/vibe" className="block mx-4 mt-4 md:mx-0 md:mt-0">
            <div
                className="rounded-[32px] p-4 md:p-5 text-white relative overflow-hidden transition-transform active:scale-[0.98] shadow-lg h-full"
                style={{
                    background: `linear-gradient(135deg, ${persona.gradient[0]} 0%, ${persona.gradient[1]} 100%)`
                }}
            >
                {/* Abstract background graphics */}
                <div className="absolute -right-6 -bottom-8 w-48 h-48 bg-white/10 blur-2xl rounded-full" />
                <div className="absolute -right-2 -bottom-2 pointer-events-none opacity-20">
                    <Icon className="w-36 h-36 text-white transform rotate-12" strokeWidth={1} />
                </div>

                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold tracking-wider">
                            YOUR VIBE THIS WEEK
                        </span>
                        <Icon className="w-4 h-4 text-white drop-shadow-sm" strokeWidth={2.5} />
                    </div>

                    <h2 className="text-3xl font-extrabold tracking-tight mb-2 drop-shadow-sm">
                        {persona.title}
                    </h2>

                    <p className="text-sm font-medium text-white/90 leading-relaxed max-w-[240px]">
                        {persona.description}
                    </p>
                </div>
            </div>
        </Link>
    );
}
