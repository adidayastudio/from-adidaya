"use client";

import React, { useCallback, useEffect, useState, useRef } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";

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

    useEffect(() => {
        setWindowHeight(window.innerHeight);
        const handleResize = () => setWindowHeight(window.innerHeight);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // Reset to medium when opening
    useEffect(() => {
        if (isOpen) setDetent("medium");
    }, [isOpen]);

    const MEDIUM_Y = windowHeight * 0.5;   // sheet top at 50% from top
    const LARGE_Y = windowHeight * 0.08;   // sheet top at 8% from top
    const DISMISS_Y = windowHeight * 0.75; // dismiss threshold

    const currentY = detent === "medium" ? MEDIUM_Y : LARGE_Y;

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
                            top: 0,
                            height: windowHeight,
                            touchAction: "none",
                        }}
                    >
                        <motion.div
                            className="flex flex-col h-full overflow-hidden"
                            animate={{
                                marginLeft: detent === "medium" ? 8 : 0,
                                marginRight: detent === "medium" ? 8 : 0,
                                marginBottom: detent === "medium" ? 8 : 0,
                                borderRadius: detent === "medium" ? 56 : 20,
                                borderTopLeftRadius: detent === "medium" ? 56 : 20,
                                borderTopRightRadius: detent === "medium" ? 56 : 20,
                                borderBottomLeftRadius: detent === "medium" ? 56 : 0,
                                borderBottomRightRadius: detent === "medium" ? 56 : 0,
                            }}
                            style={{
                                background: detent === "medium"
                                    ? "linear-gradient(180deg, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.6) 100%)"
                                    : "#F2F2F7",
                                backdropFilter: "blur(40px) saturate(200%)",
                                WebkitBackdropFilter: "blur(40px) saturate(200%)",
                                boxShadow: "0 -8px 40px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.8)",
                                border: "1px solid rgba(255,255,255,0.4)",
                            }}
                        >
                            {/* Drag handle + Header */}
                            <div className="flex-shrink-0 pt-3 pb-2 px-5">
                                {/* Drag indicator pill */}
                                <div className="w-10 h-[5px] rounded-full bg-black/20 mx-auto mb-4" />

                                {title && (
                                    <div className="flex items-center justify-between mb-2">
                                        <h2 className="text-xl font-bold text-neutral-900 tracking-tight">{title}</h2>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onClose();
                                            }}
                                            className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-500 hover:bg-black/5 transition-colors"
                                        >
                                            <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                                                <path d="M1 1L13 13M1 13L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                            </svg>
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Divider - hidden in medium to keep clean glass look */}
                            <div className={`h-px bg-neutral-200/60 mx-4 transition-opacity ${detent === "medium" ? "opacity-0" : "opacity-100"}`} />

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
