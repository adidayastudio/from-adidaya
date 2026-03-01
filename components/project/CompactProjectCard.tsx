// components/project/CompactProjectCard.tsx
import React from 'react';
import { Project } from '@/types/project';
import ProgressRing from './ProgressRing';

interface CompactProjectCardProps {
    project: Project;
    onClick?: () => void;
}

export default function CompactProjectCard({ project, onClick }: CompactProjectCardProps) {
    const progress = project.meta?.progress || Math.floor(Math.random() * 100);
    const locationText = project.location?.city || "Location";

    // Try to mock the Stage (SD, DD, CD based on progress)
    let stageCode = "SD";
    if (progress > 30) stageCode = "DD";
    if (progress > 60) stageCode = "CD";

    return (
        <div
            onClick={onClick}
            className="flex items-center justify-between p-3.5 bg-neutral-100/50 dark:bg-neutral-800/50 backdrop-blur-xl rounded-[24px] cursor-pointer mb-3 active:scale-[0.98] transition-all"
        >
            <div className="flex items-center gap-4">
                <div className="w-[52px] h-[52px] rounded-2xl overflow-hidden shrink-0 bg-neutral-200">
                    <img
                        src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=200&q=80"
                        alt={project.projectName}
                        className="w-full h-full object-cover"
                    />
                </div>

                <div className="flex flex-col">
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className="px-1.5 py-0.5 bg-neutral-200/80 dark:bg-neutral-700 text-[10px] font-bold tracking-wider text-neutral-500 dark:text-neutral-400 rounded">
                            {project.projectCode}
                        </span>
                        <h3 className="font-bold text-base text-neutral-900 dark:text-white line-clamp-1">
                            {project.projectName}
                        </h3>
                    </div>
                    <p className="text-[13px] font-medium text-neutral-400 dark:text-neutral-500">
                        {locationText} • {stageCode}
                    </p>
                </div>
            </div>

            <div className="pr-1 shrink-0">
                <ProgressRing progress={progress} />
            </div>
        </div>
    );
}
