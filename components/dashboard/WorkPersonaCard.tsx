"use client";

import React from "react";
import {
    Zap,
    ShieldAlert,
    Activity,
    Hammer,
    Compass,
    Wind,
    PauseCircle,
    AlertTriangle,
    LucideIcon
} from "lucide-react";
import { motion } from "framer-motion";
import { Persona } from "@/lib/workPersonaLogic";
import clsx from "clsx";

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

interface WorkPersonaCardProps {
    persona: Persona;
    onCtaClick?: () => void;
}

export default function WorkPersonaCard({ persona, onCtaClick }: WorkPersonaCardProps) {
    const Icon = ICON_MAP[persona.icon] || Activity;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-[28px] border border-white/40 shadow-[0_8px_32px_rgba(0,0,0,0.06)] backdrop-blur-3xl"
            style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.4) 100%)' }}
        >
            {/* Specular highlights */}
            <div className="absolute top-0 left-0 right-0 h-px bg-white/60 z-10" />
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />

            <div className="p-5 flex flex-col gap-4">
                <div className="flex items-center gap-4">
                    {/* Abstract Icon Layer */}
                    <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner"
                        style={{ background: `linear-gradient(135deg, ${persona.gradient[0]}20, ${persona.gradient[1]}20)` }}
                    >
                        <Icon
                            className="w-6 h-6"
                            style={{ color: persona.gradient[0] }}
                            strokeWidth={2}
                        />
                    </div>

                    <div className="flex flex-col">
                        <h3 className="text-lg font-bold text-neutral-900 tracking-tight leading-none mb-1">
                            {persona.title}
                        </h3>
                        <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                            Current Persona
                        </span>
                    </div>
                </div>

                <p className="text-[13px] font-medium text-neutral-500 leading-relaxed">
                    {persona.description}
                </p>

                <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={onCtaClick}
                    className="w-fit px-5 py-2.5 rounded-full text-[13px] font-bold border transition-all active:brightness-90 text-white shadow-sm"
                    style={{ background: `linear-gradient(135deg, ${persona.gradient[0]}, ${persona.gradient[1]})`, borderColor: `${persona.gradient[0]}40` }}
                >
                    {persona.ctaTitle}
                </motion.button>
            </div>
        </motion.div>
    );
}
