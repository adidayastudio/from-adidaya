"use client";

import React from "react";
import clsx from "clsx";
import { Star } from "lucide-react";
import { FileText, BookOpen, ClipboardList, Scale, Video, Image, FolderOpen, Presentation, Table, FileSpreadsheet } from "lucide-react";
import { KnowledgeType, getTypeLabel } from "./types";

const TYPE_ICON: Record<string, React.ReactNode> = {
    SOP: <FileText className="w-4 h-4" />,
    WORKFLOW: <BookOpen className="w-4 h-4" />,
    GUIDELINE: <FileText className="w-4 h-4" />,
    POLICY: <Scale className="w-4 h-4" />,
    STANDARD: <Scale className="w-4 h-4" />,
    CHECKLIST: <ClipboardList className="w-4 h-4" />,
    TEMPLATE_PPT: <Presentation className="w-4 h-4" />,
    TEMPLATE_RAB: <Table className="w-4 h-4" />,
    TEMPLATE_DRAWING: <FolderOpen className="w-4 h-4" />,
    TEMPLATE_CONTRACT: <FileText className="w-4 h-4" />,
    TEMPLATE_REPORT: <FileSpreadsheet className="w-4 h-4" />,
    VIDEO: <Video className="w-4 h-4" />,
    PHOTO: <Image className="w-4 h-4" />,
    DESIGN_REF: <Image className="w-4 h-4" />,
    MATERIAL_CATALOG: <FolderOpen className="w-4 h-4" />,
    VENDOR_LIST: <ClipboardList className="w-4 h-4" />,
    PRICE_REF: <FileSpreadsheet className="w-4 h-4" />,
};

// Theme styles matching unified premium aesthetic
const getThemeStyles = (dept: string) => {
    return {
        bg: "bg-white border border-neutral-100/80",
        iconBg: "bg-neutral-100/50",
        iconColor: "text-neutral-500",
    };
};

const DEPT_LABEL: Record<string, string> = {
    DESIGN: "Design",
    CONSTRUCTION: "Construction",
    FINANCE: "Finance",
    HR: "HR",
    OPERATION: "Operation",
};

interface LearnItemCardProps {
    title: string;
    type: KnowledgeType;
    department: string;
    lastUpdated: string;
    isFavorite?: boolean;
    onClick?: () => void;
}

export function LearnItemCard({
    title,
    type,
    department,
    lastUpdated,
    isFavorite,
    onClick,
}: LearnItemCardProps) {
    const tStyles = getThemeStyles(department);

    const dateStr = new Date(lastUpdated).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });

    return (
        <div
            onClick={onClick}
            className={clsx(
                "group relative rounded-[24px] p-4 flex gap-4 transition-all duration-300 shadow-sm",
                tStyles.bg,
                onClick && "active:scale-[0.96] hover:bg-neutral-50/50 cursor-pointer"
            )}
        >
            {/* Large Left Icon */}
            <div className={clsx(
                "shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-colors",
                tStyles.iconBg
            )}>
                {TYPE_ICON[type] ? (
                    React.cloneElement(TYPE_ICON[type] as React.ReactElement<any>, {
                        size: 24,
                        className: tStyles.iconColor
                    })
                ) : (
                    <FileText size={24} className={tStyles.iconColor} />
                )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pt-0.5">
                <h3 className="text-[17px] font-bold text-gray-900 leading-tight pr-[40px] mb-2">
                    {title}
                </h3>

                <div className="flex items-center gap-2 mt-auto">
                    <span className="bg-black/5 text-gray-500 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide">
                        {DEPT_LABEL[department] || department}
                    </span>
                    <span className="text-[12px] font-medium text-gray-400 tabular-nums">
                        {dateStr}
                    </span>
                </div>
            </div>

            {/* Badges - Absolute positioned (Top Right corner style like TaskCard) */}
            <div className="absolute top-4 right-4 flex flex-col items-end gap-1.5">
                <span className="text-[9px] px-2 py-0.5 rounded-full tracking-wider bg-white/60 text-gray-500 font-bold border border-black/[0.03] uppercase">
                    {getTypeLabel(type)}
                </span>
                {isFavorite && (
                    <div className="mt-0.5">
                        <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                    </div>
                )}
            </div>
        </div >
    );
}
