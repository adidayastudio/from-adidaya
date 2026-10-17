"use client";

import { useState, useRef, useEffect } from "react";
import { Persona } from "@/lib/workPersonaLogic";
import WorkPersonaSlide from "./slides/WorkPersonaSlide";
import ProjectHealthSlide from "./slides/ProjectHealthSlide";
import FinancePressureSlide from "./slides/FinancePressureSlide";
import TeamPulseSlide from "./slides/TeamPulseSlide";
import MilestoneSlide from "./slides/MilestoneSlide";
import clsx from "clsx";

interface DashboardCarouselProps {
    persona: Persona;
}

const GRADIENTS = [
    "from-purple-700 from-5% via-purple-300 via-100% to-purple-100/0", // Work Persona
    "from-red-700 from-5% via-red-300 via-100% to-red-50/0",       // Project Health
    "from-orange-700 from-5% via-orange-300 via-100% to-orange-50/0", // Finance
    "from-blue-700 from-5% via-blue-300 via-100% to-blue-50/0",     // Team Pulse
    "from-emerald-700 from-5% via-emerald-300 via-100% to-emerald-50/0" // Milestone
];

export default function DashboardCarousel({ persona }: DashboardCarouselProps) {
    const [activeIndex, setActiveIndex] = useState(0);
    const scrollRef = useRef<HTMLDivElement>(null);
    const isLooping = useRef(false);

    const originalSlides = [
        <WorkPersonaSlide key="work-persona" persona={persona} />,
        <ProjectHealthSlide key="project-health" />,
        <FinancePressureSlide key="finance-pressure" />,
        <TeamPulseSlide key="team-pulse" />,
        <MilestoneSlide key="milestone" />
    ];

    // Clones for infinite scroll: [Last, ...Originals, First]
    const slidesWithClones = [
        <div key="clone-last" className="w-[85vw] max-w-[340px] flex-shrink-0 snap-center">{originalSlides[originalSlides.length - 1]}</div>,
        ...originalSlides.map((slide, i) => <div key={`slide-${i}`} className="w-[85vw] max-w-[340px] flex-shrink-0 snap-center">{slide}</div>),
        <div key="clone-first" className="w-[85vw] max-w-[340px] flex-shrink-0 snap-center">{originalSlides[0]}</div>
    ];

    const handleScroll = () => {
        if (!scrollRef.current) return;

        const scrollLeft = scrollRef.current.scrollLeft;
        // The child width must perfectly match the distance between snap points
        // Our slide is max-w-[340px] or 85vw + 16px gap
        const slideEl = scrollRef.current.firstElementChild as HTMLElement;
        if (!slideEl) return;

        const childWidth = slideEl.offsetWidth + 16; // Add the 1rem (16px) gap we use in flex container

        // Determine current index based on scroll position
        const rawIndex = Math.round(scrollLeft / childWidth);
        const totalSlides = originalSlides.length;

        // Map raw index to active index (clones are at 0 and totalSlides + 1)
        let active = rawIndex - 1;
        if (active < 0) active = totalSlides - 1;
        if (active >= totalSlides) active = 0;
        setActiveIndex(active);

        // Clear existing timeout
        if (isLooping.current) clearTimeout(isLooping.current as any);

        // Wait for scrolling to stop before teleporting to prevent glitching mid-swipe
        isLooping.current = setTimeout(() => {
            if (!scrollRef.current) return;

            // If we've settled on the FIRST clone (leftmost)
            if (rawIndex === 0) {
                scrollRef.current.style.scrollBehavior = 'auto'; // Disable smooth scroll
                scrollRef.current.scrollLeft = childWidth * totalSlides; // Jump to last real slide
                // Force reflow before re-enabling smooth scroll
                void scrollRef.current.offsetWidth;
                scrollRef.current.style.scrollBehavior = 'smooth';
            }
            // If we've settled on the LAST clone (rightmost)
            else if (rawIndex === totalSlides + 1) {
                scrollRef.current.style.scrollBehavior = 'auto'; // Disable smooth scroll
                scrollRef.current.scrollLeft = childWidth; // Jump to first real slide
                // Force reflow before re-enabling smooth scroll
                void scrollRef.current.offsetWidth;
                scrollRef.current.style.scrollBehavior = 'smooth';
            }
        }, 150) as any;
    };

    // Initial Scroll to First Real Slide
    useEffect(() => {
        if (scrollRef.current) {
            const slideEl = scrollRef.current.firstElementChild as HTMLElement;
            if (slideEl) {
                const childWidth = slideEl.offsetWidth + 16;
                scrollRef.current.style.scrollBehavior = 'auto';
                scrollRef.current.scrollLeft = childWidth; // Jump to real first slide
                // Re-enable smooth scroll after initial jump
                setTimeout(() => {
                    if (scrollRef.current) scrollRef.current.style.scrollBehavior = 'smooth';
                }, 50);
            }
        }
    }, []);

    return (
        <div className="relative z-10 w-full mb-4 pb-4">
            <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="w-full overflow-x-auto snap-x snap-mandatory scrollbar-hide flex gap-4 px-[7.5vw] md:px-[calc(50vw-170px)]"
            >
                {slidesWithClones}
            </div>

            {/* Pagination Dots */}
            <div className="flex justify-center gap-2 mt-4">
                {originalSlides.map((_, i) => (
                    <div
                        key={i}
                        className={clsx(
                            "w-1.5 h-1.5 rounded-full transition-all duration-300",
                            i === activeIndex ? "bg-blue-600 w-4" : "bg-neutral-300"
                        )}
                    />
                ))}
            </div>
        </div>
    );
}
