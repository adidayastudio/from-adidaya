import React from 'react';
import { Project } from '@/types/project';
import { Star } from 'lucide-react';

interface ProjectCardProps {
    project: Project;
    onClick?: () => void;
}

export default function ProjectCard({ project, onClick }: ProjectCardProps) {
    const progress = project.meta?.progress || 0;

    let color = "#0A84FF";
    let bgColor = "rgba(10, 132, 255, 0.15)";
    if (progress > 0) {
        if (progress < 40) {
            color = "#FF3B30";
            bgColor = "rgba(255, 59, 48, 0.15)";
        } else if (progress < 60) {
            color = "#FF9500";
            bgColor = "rgba(255, 149, 0, 0.15)";
        } else if (progress >= 80) {
            color = "#34C759";
            bgColor = "rgba(52, 199, 89, 0.15)";
        }
    } else {
        // Gray for 0% or untracked
        color = "#A1A1AA";
        bgColor = "rgba(161, 161, 170, 0.15)";
    }

    let stageCode = "SD";
    if (progress > 30) stageCode = "DD";
    if (progress > 60) stageCode = "CD";

    const locationText = project.location?.city || "Location";

    return (
        <div
            onClick={onClick}
            className="relative w-[320px] h-[360px] rounded-[36px] overflow-hidden shrink-0 cursor-pointer active:scale-[0.98] transition-all select-none shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]"
        >
            {/* Background Image */}
            <img
                src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80"
                alt={project.projectName}
                className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Top right star action */}
            {project.meta?.isFavorite && (
                <div className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/80 dark:bg-black/50 backdrop-blur-xl flex items-center justify-center shadow-sm z-10">
                    <Star size={18} className="text-[#FFC107] fill-[#FFC107]" />
                </div>
            )}

            {/* Bottom Content Area */}
            <div className="absolute inset-x-0 bottom-0 top-[45%] bg-gradient-to-t from-white via-white/90 to-transparent dark:from-neutral-900 dark:via-neutral-900/90 dark:to-transparent pointer-events-none" />

            <div className="absolute inset-x-0 bottom-0 p-6 flex flex-col justify-end pointer-events-none">
                <div className="pointer-events-auto">
                    {/* Code Badge */}
                    <div className="mb-2">
                        <span className="px-2.5 py-1 bg-white/40 dark:bg-neutral-800/40 backdrop-blur-xl text-[11px] font-bold tracking-wider text-neutral-800 dark:text-neutral-200 rounded-full shadow-sm border border-neutral-100/30 dark:border-neutral-700/30">
                            {project.projectCode}
                        </span>
                    </div>

                    <h3 className="font-bold text-[22px] tracking-tight text-neutral-900 dark:text-white line-clamp-1 mb-0.5">
                        {project.projectName}
                    </h3>

                    <p className="text-[14px] font-medium text-neutral-500 dark:text-neutral-400 mb-5">
                        {locationText} • {stageCode}
                    </p>

                    {/* Progress Bar */}
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 h-1.5 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{ width: `${progress}%`, backgroundColor: color }}
                            />
                        </div>
                        <span
                            className="text-[12px] font-bold px-2 py-0.5 rounded-md"
                            style={{ color, backgroundColor: bgColor }}
                        >
                            {progress}%
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
