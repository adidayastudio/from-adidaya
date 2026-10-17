"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";

interface PortalTooltipProps {
    content: string;
    children: React.ReactNode;
}

export const PortalTooltip = ({ content, children }: PortalTooltipProps) => {
    const [isVisible, setIsVisible] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0 });

    const updateCoords = (target: HTMLElement) => {
        const rect = target.getBoundingClientRect();
        setCoords({
            top: rect.top - 8,
            left: rect.left + rect.width / 2
        });
    };

    const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
        updateCoords(e.currentTarget);
        setIsVisible(true);
    };

    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
        // Toggle for mobile/click
        updateCoords(e.currentTarget);
        setIsVisible(!isVisible);
    };

    // Close when clicking outside
    useEffect(() => {
        if (!isVisible) return;
        const handleOutsideClick = () => setIsVisible(false);
        window.addEventListener('click', handleOutsideClick);
        return () => window.removeEventListener('click', handleOutsideClick);
    }, [isVisible]);

    return (
        <>
            <div
                onMouseEnter={handleMouseEnter}
                onMouseLeave={() => setIsVisible(false)}
                onClick={handleClick}
                className="inline-flex items-center cursor-help"
            >
                {children}
            </div>
            {isVisible && typeof document !== 'undefined' && createPortal(
                <div
                    className="fixed z-[10000] px-3 py-2 bg-neutral-900/90 text-white text-xs rounded-lg shadow-xl pointer-events-none transform -translate-x-1/2 -translate-y-full backdrop-blur-sm max-w-[200px] text-center animate-in fade-in zoom-in-95 duration-200"
                    style={{ top: coords.top, left: coords.left }}
                >
                    {content}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-neutral-900/90"></div>
                </div>,
                document.body
            )}
        </>
    );
};
