"use client";

import React, { useState } from "react";
import { Plus, X, Globe, Target, Layers, ChevronDown, CheckCircle2 } from "lucide-react";
import { SocialAccount, Platform } from "./types/social.types";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";

type Props = {
    account: SocialAccount;
    onSave: (data: Partial<SocialAccount>) => void;
    onBack: () => void;
    onDelete?: (id: string) => void;
    onArchive?: (id: string, archive: boolean) => void;
};

const PLATFORM_OPTIONS: { value: Platform; label: string }[] = [
    { value: "INSTAGRAM", label: "Instagram" },
    { value: "TIKTOK", label: "TikTok" },
    { value: "LINKEDIN", label: "LinkedIn" },
    { value: "YOUTUBE", label: "YouTube" },
    { value: "FACEBOOK", label: "Facebook" },
];

const DEFAULT_PILLARS = ["Showcase", "Educational", "Culture", "Thought Leadership", "Social Proof", "Entertainment"];

export default function AccountSettingsPage({ account, onSave, onDelete, onArchive }: Props) {
    const [name, setName] = useState(account.name);
    const [handle, setHandle] = useState(account.handle);
    const [platform, setPlatform] = useState(account.platform);
    const [code, setCode] = useState(account.code || account.name.slice(0, 3).toUpperCase());
    const [quota, setQuota] = useState(account.quota || 30);
    const [pillars, setPillars] = useState<string[]>(account.contentPillars && account.contentPillars.length > 0 ? account.contentPillars : []);
    const [newPillar, setNewPillar] = useState("");
    const [isArchived, setIsArchived] = useState(account.isActive === false);
    const [showSuccess, setShowSuccess] = useState(false);

    const handleSave = () => {
        onSave({
            id: account.id,
            name,
            handle,
            platform,
            code,
            quota,
            contentPillars: pillars,
            isActive: !isArchived
        });
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
    };

    const handleArchiveToggle = () => {
        const newState = !isArchived;
        setIsArchived(newState);
        onSave({ id: account.id, isActive: !newState });
    };

    const addPillar = () => {
        if (newPillar.trim() && !pillars.includes(newPillar.trim())) {
            setPillars([...pillars, newPillar.trim()]);
            setNewPillar("");
        }
    };

    const removePillar = (pillar: string) => {
        setPillars(pillars.filter(p => p !== pillar));
    };

    const FormSection = ({ title, children, icon }: { title: string; children: React.ReactNode; icon?: React.ReactNode }) => (
        <div className="space-y-3.5">
            <div className="flex items-center gap-2 px-1">
                {icon && <div className="text-orange-500 w-3.5 h-3.5">{icon}</div>}
                <h3 className="text-[11px] font-bold text-neutral-400 uppercase tracking-[0.2em]">{title}</h3>
            </div>
            <div className="bg-white border border-neutral-100 rounded-[32px] overflow-hidden shadow-sm shadow-black/[0.005]">
                <div className="divide-y divide-neutral-50/50">
                    {children}
                </div>
            </div>
        </div>
    );

    const FormRow = ({ label, children, description }: { label: string; children: React.ReactNode; description?: string }) => (
        <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-neutral-50/30 transition-colors">
            <div className="space-y-0.5 sm:max-w-[200px]">
                <div className="text-[14px] font-bold text-neutral-800 tracking-tight">{label}</div>
                {description && <div className="text-[11px] text-neutral-400 font-medium">{description}</div>}
            </div>
            <div className="flex-1 w-full flex justify-end">
                <div className="w-full sm:max-w-[320px]">
                    {children}
                </div>
            </div>
        </div>
    );

    const InputStyles = "w-full bg-neutral-50/50 border border-neutral-100 rounded-2xl h-11 text-[14px] font-semibold text-neutral-800 px-4 focus:bg-white focus:border-orange-200 outline-none transition-all shadow-none font-sans";

    return (
        <div className="space-y-12 pb-32 animate-in fade-in slide-in-from-bottom-6 duration-1000 max-w-4xl mx-auto px-1 font-sans">
            <div className="grid grid-cols-1 gap-12">
                {/* IDENTITY SECTION */}
                <FormSection title="Account Identity" icon={<Globe className="w-3.5 h-3.5" />}>
                    <FormRow label="Internal Name" description="Team identifier.">
                        <input
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className={InputStyles}
                            placeholder="e.g. Adidaya Studio"
                        />
                    </FormRow>
                    <FormRow label="Social Platform" description="Primary content ecosystem.">
                        <div className="relative w-full">
                            <select
                                value={platform}
                                onChange={(e) => setPlatform(e.target.value as Platform)}
                                className={clsx(InputStyles, "appearance-none cursor-pointer font-sans")}
                                style={{
                                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
                                }}
                            >
                                {PLATFORM_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value} className="font-sans" style={{ fontFamily: '-apple-system, sans-serif' }}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400">
                                <ChevronDown size={18} strokeWidth={1.5} />
                            </div>
                        </div>
                    </FormRow>
                    <FormRow label="Public Handle" description="Username on platform.">
                        <input
                            value={handle}
                            onChange={e => setHandle(e.target.value)}
                            className={InputStyles}
                            placeholder="@handle"
                        />
                    </FormRow>
                    <FormRow label="Short Code" description="Dashboard indicator.">
                        <input
                            value={code}
                            onChange={e => setCode(e.target.value.toUpperCase().slice(0, 3))}
                            maxLength={3}
                            className={clsx(InputStyles, "w-24 text-center font-bold uppercase tracking-[0.2em] text-orange-600")}
                        />
                    </FormRow>
                </FormSection>

                {/* TARGETS SECTION */}
                <FormSection title="Performance Targets" icon={<Target className="w-3.5 h-3.5" />}>
                    <FormRow label="Monthly Quota" description="Goal posts per month.">
                        <div className="flex items-center gap-3">
                            <input
                                type="number"
                                value={quota}
                                onChange={e => setQuota(parseInt(e.target.value) || 0)}
                                min={1}
                                className={clsx(InputStyles, "w-24 text-center font-bold")}
                            />
                            <span className="text-[10px] font-bold text-neutral-400 tracking-widest uppercase shrink-0">POSTS / MO</span>
                        </div>
                    </FormRow>
                </FormSection>

                {/* CONTENT PILLARS */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                            <Layers className="w-3.5 h-3.5 text-orange-500" />
                            <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em]">Content Pillars</h3>
                        </div>
                        <span className="text-[9px] font-bold bg-neutral-100 text-neutral-500 px-3 py-1 rounded-full uppercase tracking-widest">{pillars.length} ACTIVE</span>
                    </div>

                    <div className="bg-white border border-neutral-100 rounded-[32px] p-8 shadow-sm">
                        <div className="flex flex-wrap gap-2.5 mb-10">
                            {pillars.map(pillar => (
                                <div
                                    key={pillar}
                                    className="group flex items-center gap-2 bg-neutral-50 border border-neutral-100 text-neutral-800 text-[13px] font-semibold px-5 py-2.5 rounded-full hover:border-orange-500 hover:bg-orange-50/30 transition-all shadow-sm shadow-black/[0.01]"
                                >
                                    {pillar}
                                    <button
                                        onClick={() => removePillar(pillar)}
                                        className="text-neutral-300 hover:text-red-500 transition-colors"
                                    >
                                        <X size={16} strokeWidth={2} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Redesigned Thick Pill Row - Flush Button on Right */}
                        <div className="flex items-center bg-neutral-50/50 border border-neutral-100 rounded-full p-1 pl-6 focus-within:bg-white focus-within:ring-2 focus-within:ring-orange-500/10 transition-all overflow-hidden">
                            <input
                                placeholder="Name your next pillar..."
                                value={newPillar}
                                onChange={e => setNewPillar(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && addPillar()}
                                className="bg-transparent border-none h-12 text-[14px] font-medium outline-none flex-1 pr-4"
                            />
                            <button
                                className="bg-orange-500 hover:bg-orange-600 text-white rounded-full h-12 px-10 font-bold text-[14px] flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-orange-500/20 shrink-0"
                                onClick={addPillar}
                            >
                                <Plus size={18} strokeWidth={2.5} />
                                <span>Add Pillar</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* SAVE ACTION - Exact style match from Filter Drawer */}
                <div className="pt-8 px-4 flex flex-col items-center gap-6 text-center">
                    <button
                        onClick={handleSave}
                        className="w-full bg-orange-500 backdrop-blur-xl backdrop-saturate-[1.5] text-white py-4.5 rounded-full font-bold text-[17px] active:scale-[0.98] transition-all shadow-xl shadow-orange-500/30 border border-white/20 ring-1 ring-inset ring-white/10 flex items-center justify-center min-h-[64px]"
                    >
                        Save All Changes
                    </button>

                    <div className="w-full grid grid-cols-2 gap-3 mt-2">
                        <button
                            onClick={handleArchiveToggle}
                            className="bg-neutral-100/80 text-neutral-600 py-4 rounded-full font-bold text-[14px] active:scale-95 transition-all text-center border border-neutral-200"
                        >
                            {isArchived ? "Unarchive Account" : "Archive Account"}
                        </button>
                        <button
                            onClick={() => onDelete?.(account.id)}
                            className="bg-red-50 text-red-500 py-4 rounded-full font-bold text-[14px] active:scale-95 transition-all text-center border border-red-100"
                        >
                            Delete Account
                        </button>
                    </div>


                    <AnimatePresence>
                        {showSuccess && (
                            <motion.div
                                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[100] bg-neutral-900 text-white px-6 py-4 rounded-full shadow-2xl flex items-center gap-3 border border-white/10 backdrop-blur-xl"
                            >
                                <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                                    <CheckCircle2 size={16} strokeWidth={3} />
                                </div>
                                <span className="text-[14px] font-bold">Changes saved successfully</span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
