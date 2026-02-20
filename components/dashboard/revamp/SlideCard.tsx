import { ReactNode } from "react";
import clsx from "clsx";
import { motion } from "framer-motion";

interface SlideCardProps {
    children: ReactNode;
    className?: string; // Additional classes
    color?: "purple" | "red" | "orange" | "blue" | "green"; // Kept for API compatibility
    onClick?: () => void;
}

export default function SlideCard({ children, className, onClick, color = "blue" }: SlideCardProps) {
    const bgMap = {
        purple: "bg-gradient-to-br from-purple-400 via-purple-500 to-purple-700",
        red: "bg-gradient-to-br from-rose-400 via-rose-500 to-rose-700",
        orange: "bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700",
        blue: "bg-gradient-to-br from-blue-400 via-blue-500 to-blue-700",
        green: "bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-700",
    };

    return (
        <motion.div
            onClick={onClick}
            className={clsx(
                "relative w-full h-[360px] flex flex-col items-center justify-center text-center p-6 shrink-0 font-sans rounded-[32px] overflow-hidden",
                bgMap[color],
                className
            )}
        >
            {/* Content Container - Centered */}
            <div className="relative z-10 w-full flex flex-col items-center justify-center h-full gap-3">
                {children}
            </div>
        </motion.div>
    );
}
