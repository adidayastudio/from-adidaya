"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
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
        <Link href="/dashboard/vibe" className="block mt-4 md:mt-0 h-full">
            <motion.div 
                whileHover={{ scale: 1.02, zIndex: 50 }}
                whileTap={{ scale: 0.98 }}
                className="relative h-full transition-all duration-300 group cursor-pointer"
            >
                <div
                    className="rounded-[24px] p-6 md:p-8 text-neutral-900 dark:text-white relative overflow-hidden h-full border border-neutral-200/50 dark:border-white/10 group-hover:border-neutral-300 dark:group-hover:border-white/20 bg-white dark:bg-[#0A0A0B] shadow-sm group-hover:shadow-[0_20px_40px_rgba(0,0,0,0.1)] dark:group-hover:shadow-[0_20px_40px_rgba(0,0,0,0.3)]"
                >
                    {/* Immersive Background Glow */}
                    <div 
                        className="absolute inset-0 opacity-[0.05] dark:opacity-20 group-hover:opacity-[0.1] dark:group-hover:opacity-30 transition-opacity duration-700 blur-[80px]"
                        style={{
                            background: `radial-gradient(circle at 100% 100%, ${persona.gradient[0]} 0%, ${persona.gradient[1]} 100%)`
                        }}
                    />
                    
                    {/* Abstract background graphics */}
                    <div className="absolute -right-6 -bottom-8 w-64 h-64 bg-neutral-100 dark:bg-white/5 blur-3xl rounded-full" />
                    <div className="absolute -right-4 -bottom-4 pointer-events-none opacity-[0.03] dark:opacity-[0.05] group-hover:opacity-[0.06] dark:group-hover:opacity-10 transition-all duration-700 group-hover:scale-110 group-hover:rotate-6">
                        <Icon className="w-56 h-56 text-neutral-900 dark:text-white" strokeWidth={0.5} />
                    </div>
    
                    <div className="relative z-10 flex flex-col h-full justify-between">
                        <div>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="bg-neutral-100 dark:bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-neutral-200 dark:border-white/10 shadow-sm">
                                    <span className="text-[10px] font-black tracking-[0.2em] text-neutral-400 dark:text-white/60 group-hover:text-neutral-600 dark:group-hover:text-white transition-colors uppercase">
                                        Your Vibe This Week
                                    </span>
                                </div>
                                <div className="w-2 h-2 rounded-full bg-[#AEF182] animate-pulse shadow-[0_0_8px_#AEF182]" />
                            </div>
    
                            <h2 className="text-[42px] font-black tracking-tight mb-4 leading-none group-hover:translate-x-1 transition-transform duration-500">
                                {persona.title.split(' ')[1] || persona.title}<span className="text-[#AEF182]">.</span>
                            </h2>
    
                            <p className="text-[15px] font-medium text-neutral-500 dark:text-white/40 leading-relaxed max-w-[280px] group-hover:text-neutral-700 dark:group-hover:text-white/60 transition-colors duration-500">
                                {persona.description}
                            </p>
                        </div>
    
                        <div className="mt-8 flex items-center gap-2 text-[11px] font-black text-neutral-400 dark:text-white/30 uppercase tracking-[0.15em] group-hover:text-neutral-600 dark:group-hover:text-white/60 transition-colors transition-transform group-hover:translate-x-1 duration-500">
                            View Analysis <span>→</span>
                        </div>
                    </div>
                </div>
            </motion.div>
        </Link>
    );
}
