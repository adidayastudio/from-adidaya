import SlideCard from "../SlideCard";
import { Banknote } from "lucide-react";

export default function FinancePressureSlide() {
    return (
        <SlideCard color="orange">
            {/* Large 3D-style Icon */}
            <div className="w-24 h-24 flex-shrink-0 rounded-[24px] bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center shadow-2xl shadow-orange-900/50 mb-2 transform rotate-2">
                <Banknote className="w-12 h-12 text-white/90 drop-shadow-md" strokeWidth={1.5} />
                <div className="absolute inset-0 rounded-[24px] bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
            </div>

            <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-200/60">
                    FINANCE
                </span>
                <h3 className="text-2xl font-bold text-white tracking-tight leading-tight">
                    Rp 12.500.000
                </h3>
                <p className="text-sm font-medium text-white/70 leading-relaxed max-w-[240px]">
                    Total operational expenses recorded this week.
                </p>
            </div>

            <button className="mt-2 px-8 py-3 rounded-full bg-white/10 border border-white/20 text-sm font-semibold text-white backdrop-blur-md active:scale-95 hover:scale-105 transition-all duration-300">
                View Report
            </button>
        </SlideCard>
    );
}
