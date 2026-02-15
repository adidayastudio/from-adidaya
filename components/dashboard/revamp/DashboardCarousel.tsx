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
        <div key="clone-last" className="w-full flex-shrink-0">{originalSlides[originalSlides.length - 1]}</div>,
        ...originalSlides.map((slide, i) => <div key={`slide-${i}`} className="w-full flex-shrink-0">{slide}</div>),
        <div key="clone-first" className="w-full flex-shrink-0">{originalSlides[0]}</div>
    ];

    const handleScroll = () => {
        if (scrollRef.current && !isLooping.current) {
            const scrollLeft = scrollRef.current.scrollLeft;
            const width = scrollRef.current.offsetWidth;
            const rawIndex = Math.round(scrollLeft / width);

            // Map raw index to active index
            let newIndex = rawIndex - 1;
            if (newIndex < 0) newIndex = originalSlides.length - 1;
            if (newIndex >= originalSlides.length) newIndex = 0;

            setActiveIndex(newIndex);

            // Teleport logic
            if (rawIndex === 0) { // At Clone Last
                isLooping.current = true;
                requestAnimationFrame(() => {
                    if (scrollRef.current) {
                        scrollRef.current.style.scrollBehavior = 'auto';
                        scrollRef.current.scrollLeft = width * originalSlides.length;
                        requestAnimationFrame(() => {
                            if (scrollRef.current) {
                                scrollRef.current.style.scrollBehavior = '';
                                isLooping.current = false;
                            }
                        });
                    }
                });
            } else if (rawIndex === slidesWithClones.length - 1) { // At Clone First
                isLooping.current = true;
                requestAnimationFrame(() => {
                    if (scrollRef.current) {
                        scrollRef.current.style.scrollBehavior = 'auto';
                        scrollRef.current.scrollLeft = width;
                        requestAnimationFrame(() => {
                            if (scrollRef.current) {
                                scrollRef.current.style.scrollBehavior = '';
                                isLooping.current = false;
                            }
                        });
                    }
                });
            }
        }
    };

    // Initial Scroll to First Real Slide
    useEffect(() => {
        if (scrollRef.current) {
            const width = scrollRef.current.offsetWidth;
            scrollRef.current.scrollLeft = width; // Index 1
        }
    }, []);

    return (
        <>
            {/* GLOBAL BACKGROUND - Hero Section Only */}
            <div className="absolute top-0 left-0 right-0 h-[60vh] z-0 overflow-hidden pointer-events-none">
                {/* Current Gradient */}
                {GRADIENTS.map((gradient, index) => (
                    <div
                        key={index}
                        className={clsx(
                            "absolute inset-0 bg-gradient-to-b transition-opacity duration-1000 ease-in-out",
                            gradient,
                            activeIndex === index ? "opacity-100" : "opacity-0"
                        )}
                    />
                ))}

                {/* Bottom Fade to Page Background (neutral-50) */}
                <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-b from-transparent to-neutral-50" />
            </div>

            {/* Carousel Container */}
            <div className="relative z-10 w-full mt-28 pb-4">
                <div
                    ref={scrollRef}
                    onScroll={handleScroll}
                    className="w-full overflow-x-auto snap-x snap-mandatory scrollbar-hide flex"
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
                                i === activeIndex ? "bg-white w-4" : "bg-white/30"
                            )}
                        />
                    ))}
                </div>
            </div>
        </>
    );
}
