"use client";

import React, { useState } from "react";
import clsx from "clsx";
import { ChevronDown, Maximize2, Camera } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { CatalogResource } from "@/lib/api/resources-client";

export type ResourceStatus =
    | 'Available' | 'Low Stock' | 'Out of Stock' | 'Transferred' | 'In Stock'
    | 'Maintenance' | 'Broken' | 'On Lease';

const STATUS_MAP: Record<string, { color: string, bg: string, border: string }> = {
    'In Stock': {
        color: 'text-blue-600 dark:text-blue-400',
        bg: 'bg-blue-50/50 dark:bg-blue-500/10',
        border: 'border-blue-100/50 dark:border-blue-500/20'
    },
    'Low Stock': {
        color: 'text-orange-600 dark:text-orange-400',
        bg: 'bg-orange-50/50 dark:bg-orange-500/10',
        border: 'border-orange-100/50 dark:border-orange-500/20'
    },
    'Out of Stock': {
        color: 'text-rose-600 dark:text-rose-400',
        bg: 'bg-rose-50/50 dark:bg-rose-500/10',
        border: 'border-rose-100/50 dark:border-rose-500/20'
    },
    'Available': {
        color: 'text-emerald-600 dark:text-emerald-400',
        bg: 'bg-emerald-50/50 dark:bg-emerald-500/10',
        border: 'border-emerald-100/50 dark:border-emerald-500/20'
    },
    'Maintenance': {
        color: 'text-amber-600 dark:text-amber-400',
        bg: 'bg-amber-50/50 dark:bg-amber-500/10',
        border: 'border-amber-100/50 dark:border-amber-500/20'
    },
    'Broken': {
        color: 'text-rose-600 dark:text-rose-400',
        bg: 'bg-rose-50/50 dark:bg-rose-500/10',
        border: 'border-rose-100/50 dark:border-rose-500/20'
    },
    'Transferred': {
        color: 'text-purple-600 dark:text-purple-400',
        bg: 'bg-purple-50/50 dark:bg-purple-500/10',
        border: 'border-purple-100/50 dark:border-purple-500/20'
    },
};

const CATEGORY_CODES: Record<string, string> = {
    material: 'MT',
    tool: 'TL',
    asset: 'AS',
    service: 'SV',
    labor: 'LB',
    equipment: 'EQ',
};

const SUBCATEGORY_BADGE_MAP: Record<string, string> = {
    'arsitektur': 'ARS',
    'struktur': 'STR',
    'mep': 'MEP',
    'finishing': 'FIN',
    'interior': 'INT',
    'lansekap': 'LAN',
    'umum': 'GEN',
};

const UNIT_FORMAT_MAP: Record<string, string> = {
    'm3': 'm³',
    'm2': 'm²',
    'm1': 'm',
};

export function formatUnit(unit: string) {
    const u = unit.toLowerCase();
    return UNIT_FORMAT_MAP[u] || u;
}

export function smartCapitalize(text: string) {
    if (!text) return "";
    const lowerUnits = new Set(['kg', 'cm', 'mm', 'ml', 'm3', 'm2', 'm', 'sak', 'btg', 'pcs', 'ls', 'dus', 'box']);
    return text.split(' ').map(word => {
        const cleanWord = word.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (lowerUnits.has(cleanWord)) return word.toLowerCase();
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }).join(' ');
}

const LEVEL2_MAP: Record<string, string> = {
    'struktur': '01',
    'arsitektur': '02',
    'mep': '03',
    'finishing': '04',
    'umum': '00',
};

const LEVEL3_MAP: Record<string, string> = {
    'dinding': '01',
    'beton': '02',
    'besi': '03',
    'lantai': '04',
    'plafon': '05',
    'kaca': '06',
    'kayu': '07',
    'cat': '08',
    'atap': '09',
    'sanitair': '10',
};

export function generateResourceCode(item: CatalogResource) {
    const cat = CATEGORY_CODES[item.category] || 'MT';
    const sub = (item.subcategory || 'umum').toLowerCase();
    const l2 = LEVEL2_MAP[sub] || '99';
    const grp = (item.group_name || 'umum').toLowerCase();
    const l3 = LEVEL3_MAP[grp] || '99';

    const getL4Code = (name: string) => {
        let hash = 0;
        for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
        return Math.abs(hash % 999).toString().padStart(3, '0');
    };
    const l4 = getL4Code(item.name.split(' - ')[0].trim().toLowerCase());
    const variant = ((item as any).metadata?.variant_index || 1).toString().padStart(3, '0');

    return `${cat}${l2}${l3}${l4}-${variant}`;
}

export interface CatalogCardProps {
    item: CatalogResource;
    onOpenDetail?: () => void;
    projectStock?: { project: string, quantity: number, unit: string, photo?: string }[];
}

export function ResourceCard({ item, onOpenDetail, projectStock }: CatalogCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const code = generateResourceCode(item);
    const totalQuantity = projectStock?.reduce((acc, curr) => acc + curr.quantity, 0) || 0;

    const isTool = item.category === 'tool' || item.category === 'equipment';
    const status = isTool
        ? (totalQuantity > 0 ? 'Available' : 'Maintenance')
        : (totalQuantity <= 0 ? 'Out of Stock' : totalQuantity < 10 ? 'Low Stock' : 'In Stock');

    const statusTheme = STATUS_MAP[status] || STATUS_MAP['In Stock'];
    const sub = (item.subcategory || 'umum').toLowerCase();
    const badgeCode = SUBCATEGORY_BADGE_MAP[sub] || CATEGORY_CODES[item.category] || "RES";

    return (
        <div
            className={clsx(
                "group relative bg-white/40 dark:bg-neutral-900/40 backdrop-blur-3xl backdrop-saturate-[1.8] rounded-[24px] border border-white/60 dark:border-neutral-800 transition-all duration-300 overflow-hidden flex flex-col shadow-[0_4px_24px_rgba(0,0,0,0.04)]",
                isExpanded && "bg-white/60 dark:bg-neutral-800/60 shadow-[0_12px_48px_-12px_rgba(0,0,0,0.1)]"
            )}
        >
            <div className="absolute inset-0 rounded-[24px] border border-black/[0.02] dark:border-white/[0.02] pointer-events-none" />

            <div
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-start justify-between p-5 gap-6 cursor-pointer relative z-10"
            >
                <div className="flex flex-col gap-1.5 min-w-0">
                    <h3 className="text-[16px] font-bold text-neutral-900 dark:text-white tracking-tight leading-snug line-clamp-2">
                        {smartCapitalize(item.name)}
                    </h3>

                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-neutral-900/5 dark:bg-white/5 text-neutral-500 dark:text-neutral-400 uppercase tracking-wider border border-black/[0.03] dark:border-white/[0.05]">
                            {badgeCode}
                        </span>
                        <span className="text-[12px] font-medium text-neutral-400 dark:text-neutral-500 tabular-nums">
                            {code}
                        </span>
                    </div>
                </div>

                <div className="flex items-start gap-4 md:gap-6 shrink-0 ml-4">
                    <div className="flex flex-col items-end gap-1 shrink-0">
                        <div className="flex items-baseline gap-1">
                            <span className="text-[17px] font-bold text-neutral-900 dark:text-white tracking-tight tabular-nums">
                                {totalQuantity.toLocaleString()}
                            </span>
                            <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 tracking-tight">
                                {formatUnit(item.unit || "pcs")}
                            </span>
                        </div>

                        <span className={clsx(
                            "px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide border uppercase",
                            statusTheme.color, statusTheme.bg, statusTheme.border
                        )}>
                            {status}
                        </span>
                    </div>

                    <motion.div
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        className="mt-1"
                    >
                        <ChevronDown className="w-5 h-5 text-neutral-300" />
                    </motion.div>
                </div>
            </div>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="bg-black/[0.02] dark:bg-white/[0.02] border-t border-black/[0.05] dark:border-white/[0.05]"
                    >
                        <div className="p-5 pt-4 space-y-4">
                            <div className="grid grid-cols-1 gap-2">
                                {projectStock && projectStock.length > 0 ? projectStock.map((ps, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 rounded-[18px] bg-white/40 dark:bg-neutral-800/40 border border-black/5 dark:border-white/5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-white dark:bg-neutral-700 flex items-center justify-center overflow-hidden border border-black/5 dark:border-white/10 shrink-0">
                                                {ps.photo ? <img src={ps.photo} className="w-full h-full object-cover" /> : <Camera className="w-3.5 h-3.5 text-neutral-300" />}
                                            </div>
                                            <div className="flex flex-col gap-0.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="px-1.5 py-0.5 rounded-full bg-neutral-900/5 dark:bg-white/5 border border-black/[0.05] dark:border-white/[0.05] text-[10px] font-medium text-neutral-700 dark:text-neutral-300 tracking-wider">
                                                        {(ps.project || "---").substring(0, 3).toUpperCase()}
                                                    </span>
                                                    <span className="text-[10px] font-medium text-neutral-400 dark:text-neutral-500 tabular-nums">
                                                        {(ps as any).lastUpdated || "9 Mar"}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[16px] font-extrabold text-neutral-900 dark:text-white tabular-nums">{ps.quantity}</span>
                                            <span className="text-[10px] font-bold text-neutral-400 ml-1">{formatUnit(ps.unit)}</span>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="py-2 text-center text-[12px] text-neutral-400 font-medium italic">No projects allocated.</div>
                                )}
                            </div>

                            <button
                                onClick={(e) => { e.stopPropagation(); onOpenDetail?.(); }}
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-blue-600 dark:bg-blue-500 text-white text-[12px] font-bold tracking-tight hover:bg-blue-700 dark:hover:bg-blue-400 active:scale-[0.98] transition-all shadow-lg shadow-blue-600/20"
                            >
                                <Maximize2 className="w-3.5 h-3.5" /> View full details
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
