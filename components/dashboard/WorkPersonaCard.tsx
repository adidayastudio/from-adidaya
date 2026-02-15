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
import { Persona, PersonaTone } from "@/lib/workPersonaLogic";
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

    const toneColors: Record<PersonaTone, { icon: string; bg: string; text: string; button: string }> = {
        positive: {
            icon: "text-emerald-500",
            bg: "bg-emerald-500/10",
            text: "text-emerald-700",
            button: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
        },
        neutral: {
            icon: "text-blue-500",
            bg: "bg-blue-500/10",
            text: "text-blue-700",
            button: "bg-blue-500/10 text-blue-600 border-blue-500/20",
        },
        negative: {
            icon: "text-orange-500",
            bg: "bg-orange-500/10",
            text: "text-orange-700",
            button: "bg-orange-500/10 text-orange-600 border-orange-500/20",
        },
    };

    const colors = toneColors[persona.tone];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-[28px] border border-white/40 shadow-[0_8px_32px_rgba(0,0,0,0.06)] backdrop-blur-3xl"
            style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.4) 100%)' }}
        >
            {/* Specular highlights */}
            <div className="absolute top-0 left-0 right-0 h-px bg-white/60 z-10" />
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />

            <div className="p-5 flex flex-col gap-4">
                <div className="flex items-center gap-4">
                    {/* Abstract Icon Layer */}
                    <div className={clsx("w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner", colors.bg)}>
                        <Icon className={clsx("w-6 h-6", colors.icon)} strokeWidth={2} />
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
                    className={clsx(
                        "w-fit px-5 py-2.5 rounded-full text-[13px] font-bold border transition-all active:brightness-90",
                        colors.button
                    )}
                >
                    {persona.ctaTitle}
                </motion.button>
            </div>
        </motion.div>
    );
}
