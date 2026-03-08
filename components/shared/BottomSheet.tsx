"use client";

import React, { useCallback, useEffect, useState, useRef } from "react";
import { motion, AnimatePresence, PanInfo, useMotionValue, useTransform } from "framer-motion";
import { useTheme } from "next-themes";

interface BottomSheetProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
}

/**
 * iOS-style bottom sheet with medium → large presentation detents.
 * - Opens at ~50% (medium)
 * - Drag up to expand to ~92% (large)
 * - Drag down to dismiss
 * - Backdrop tap to dismiss
 */
export default function BottomSheet({ isOpen, onClose, title, children }: BottomSheetProps) {
    const [windowHeight, setWindowHeight] = useState(0);
    const [detent, setDetent] = useState<"medium" | "large">("medium");
    const constraintsRef = useRef<HTMLDivElement>(null);
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        setWindowHeight(window.innerHeight);
        const handleResize = () => setWindowHeight(window.innerHeight);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // Reset to medium when opening
    useEffect(() => {
        if (isOpen) setDetent("medium");
    }, [isOpen]);

    const dragY = useMotionValue(0);

    const MEDIUM_Y = windowHeight * 0.5;   // sheet top at 50% from top
    const LARGE_Y = windowHeight * 0.08;   // sheet top at 8% from top
    const DISMISS_Y = windowHeight * 0.75; // dismiss threshold

    const currentY = detent === "medium" ? MEDIUM_Y : LARGE_Y;

    // Reactively adjust dimensions and borders based on exact drag position
    const sheetMargin = useTransform(dragY, (y) => {
        let p = 1;
        if (y < MEDIUM_Y) p = Math.max(0, (y - LARGE_Y) / (MEDIUM_Y - LARGE_Y));
        return p * 8;
    });

    const sheetRadiusTop = useTransform(dragY, (y) => {
        let p = 1;
        if (y < MEDIUM_Y) p = Math.max(0, (y - LARGE_Y) / (MEDIUM_Y - LARGE_Y));
        return 20 + p * 36;
    });

    const sheetRadiusBottom = useTransform(dragY, (y) => {
        let p = 1;
        if (y < MEDIUM_Y) p = Math.max(0, (y - LARGE_Y) / (MEDIUM_Y - LARGE_Y));
        return p * 56;
    });

    const sheetHeightDynamic = useTransform(dragY, (y) => {
        if (!windowHeight) return "100%";
        let gap = 8;
        if (y < MEDIUM_Y) {
            const p = Math.max(0, (y - LARGE_Y) / (MEDIUM_Y - LARGE_Y));
            gap = p * 8;
        }
        return Math.max(0, windowHeight - y - gap);
    });

    const handleDragEnd = useCallback((_: any, info: PanInfo) => {
        if (!windowHeight) return;

        const projectedY = currentY + info.offset.y;
        const velocity = info.velocity.y;

        // Fast fling down → dismiss
        if (velocity > 600) {
            onClose();
            return;
        }
        // Fast fling up → large
        if (velocity < -600) {
            setDetent("large");
            return;
        }

        // Snap based on position
        if (projectedY > DISMISS_Y) {
            onClose();
        } else if (projectedY > (MEDIUM_Y + LARGE_Y) / 2) {
            setDetent("medium");
        } else {
            setDetent("large");
        }
    }, [windowHeight, currentY, onClose, MEDIUM_Y, LARGE_Y, DISMISS_Y]);

    if (!windowHeight) return null;

    const sheetHeight = windowHeight - currentY;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        key="notif-sheet-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="fixed inset-0 z-[9998] bg-black/35"
                        onClick={onClose}
                        style={{ WebkitTapHighlightColor: "transparent" }}
                    />

                    {/* Sheet */}
                    <motion.div
                        key="notif-sheet"
                        initial={{ y: windowHeight }}
                        animate={{ y: currentY }}
                        exit={{ y: windowHeight }}
                        transition={{
                            type: "spring",
                            stiffness: 300,
                            damping: 30,
                            mass: 0.8,
                        }}
                        drag="y"
                        dragConstraints={{ top: LARGE_Y - currentY, bottom: windowHeight - currentY }}
                        dragElastic={0.15}
                        onDragEnd={handleDragEnd}
                        className="fixed left-0 right-0 z-[9999]"
                        style={{
                            y: dragY, // Bind external MotionValue
                            top: 0,
                            height: windowHeight,
                            touchAction: "none",
                        }}
                    >
                        <motion.div
                            className="flex flex-col overflow-hidden"
                            style={{
                                height: sheetHeightDynamic,
                                marginLeft: sheetMargin,
                                marginRight: sheetMargin,
                                marginBottom: sheetMargin,
                                borderTopLeftRadius: sheetRadiusTop,
                                borderTopRightRadius: sheetRadiusTop,
                                borderBottomLeftRadius: sheetRadiusBottom,
                                borderBottomRightRadius: sheetRadiusBottom,
                                background: !mounted ? "#F2F2F7" : theme === 'dark'
                                    ? detent === "medium" ? "rgba(30, 30, 30, 0.85)" : "#121212"
                                    : detent === "medium" ? "linear-gradient(180deg, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.6) 100%)" : "#F2F2F7",
                                backdropFilter: "blur(40px) saturate(200%)",
                                WebkitBackdropFilter: "blur(40px) saturate(200%)",
                                boxShadow: !mounted || theme !== 'dark'
                                    ? "0 -8px 40px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.8)"
                                    : "0 -8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
                                border: !mounted || theme !== 'dark'
                                    ? "1px solid rgba(255,255,255,0.4)"
                                    : "1px solid rgba(255,255,255,0.1)",
                            }}
                        >
                            {/* Drag handle + Header */}
                            <div className="flex-shrink-0 pt-3 pb-2 px-5">
                                {/* Drag indicator pill */}
                                <div className="w-10 h-[5px] rounded-full bg-black/20 dark:bg-white/20 mx-auto mb-4" />

                                {title && (
                                    <div className="flex items-center justify-between mb-2">
                                        <h2 className="text-xl font-bold text-neutral-900 dark:text-white tracking-tight">{title}</h2>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onClose();
                                            }}
                                            className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-500 hover:bg-black/5 dark:text-neutral-400 dark:hover:bg-white/10 transition-colors"
                                        >
                                            <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                                                <path d="M1 1L13 13M1 13L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                            </svg>
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Divider - hidden in medium to keep clean glass look */}
                            <div className={`h-px bg-neutral-200/60 dark:bg-white/10 mx-4 transition-opacity ${detent === "medium" ? "opacity-0" : "opacity-100"}`} />

                            {/* Scrollable content */}
                            <div
                                className="flex-1 overflow-y-auto overscroll-contain"
                                onPointerDownCapture={(e) => e.stopPropagation()}
                            >
                                {children}
                            </div>
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
