import { Persona } from "@/lib/workPersonaLogic";
import SlideCard from "../SlideCard";
import { Zap, ShieldAlert, Activity, Hammer, Compass, Wind, PauseCircle, AlertTriangle, LucideIcon } from "lucide-react";
import clsx from "clsx";

// Icon Map (Reusing from WorkPersonaCard)
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

interface WorkPersonaSlideProps {
    persona: Persona;
}

export default function WorkPersonaSlide({ persona }: WorkPersonaSlideProps) {
    const Icon = ICON_MAP[persona.icon] || Activity;

    return (
        <SlideCard color="purple">
            {/* Large 3D-style Icon */}
            <div className="w-24 h-24 flex-shrink-0 rounded-[24px] bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center shadow-2xl shadow-purple-900/50 mb-2 transform rotate-3">
                <Icon className="w-12 h-12 text-white/90 drop-shadow-md" strokeWidth={1.5} />
                {/* Gloss effect */}
                <div className="absolute inset-0 rounded-[24px] bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
            </div>

            <div className="space-y-1 relative z-10">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-purple-100/70">
                    LET'S WORK
                </span>
                <h3 className="text-xl font-bold text-white tracking-tight leading-tight">
                    {persona.title}
                </h3>
                <p className="text-xs font-medium text-white/80 leading-relaxed max-w-[240px]">
                    {persona.description}
                </p>
            </div>

            <button className="mt-2 px-8 py-3 rounded-full bg-white/10 border border-white/20 text-sm font-semibold text-white backdrop-blur-md active:scale-95 hover:scale-105 transition-all duration-300">
                {persona.ctaTitle}
            </button>
        </SlideCard>
    );
}
