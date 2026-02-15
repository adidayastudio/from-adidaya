import { ReactNode } from "react";
import clsx from "clsx";
import { motion } from "framer-motion";

interface SlideCardProps {
    children: ReactNode;
    className?: string; // Additional classes
    color?: "purple" | "red" | "orange" | "blue" | "green"; // Kept for API compatibility, unused for bg now
    onClick?: () => void;
}

export default function SlideCard({ children, className, onClick }: SlideCardProps) {
    return (
        <motion.div
            onClick={onClick}
            className={clsx(
                "relative w-screen h-[45vh] flex flex-col items-center justify-center text-center p-4 shrink-0 snap-center font-sans",
                className
            )}
        >
            {/* Content Container - Centered */}
            <div className="relative z-10 w-full max-w-xs flex flex-col items-center justify-center h-full gap-4">
                {children}
            </div>
        </motion.div>
    );
}
