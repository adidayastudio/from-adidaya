import { PERSONAS, Persona } from "@/lib/workPersonaLogic";
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
        <div
            className="w-full h-full rounded-[32px] p-6 relative overflow-hidden flex flex-col justify-between"
            style={{
                background: `linear-gradient(135deg, ${persona.gradient[0]} 0%, ${persona.gradient[1]} 100%)`
            }}
        >
            {/* Abstract background graphics */}
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 blur-3xl rounded-full" />

            <div className="relative z-10 flex items-start justify-between">
                <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">
                        LET'S WORK
                    </span>
                    <h3 className="text-2xl font-bold text-white tracking-tight leading-tight">
                        {persona.title}
                    </h3>
                    <p className="text-xs font-medium text-white/80 leading-relaxed max-w-[180px]">
                        {persona.description}
                    </p>
                </div>

                <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 transform rotate-6 shadow-xl">
                    <Icon className="w-8 h-8 text-white" strokeWidth={1.5} />
                </div>
            </div>

            <button className="relative z-10 mt-4 w-full py-3 rounded-2xl bg-white/10 border border-white/20 text-sm font-bold text-white backdrop-blur-md active:scale-95 transition-all">
                {persona.ctaTitle}
            </button>
        </div>
    );
}
