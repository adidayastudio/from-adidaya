"use client";

import { useState, useEffect, useRef } from "react";
import { X, Calendar, User, Info, MapPin, Briefcase, ChevronDown, RotateCcw, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import { Project } from "@/types/project";
import { PROJECT_STAGES } from "@/shared/constants/project-stage";

interface NewProjectDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (project: any) => void;
    existingProjects: Project[];
}

export default function NewProjectDrawer({
    isOpen,
    onClose,
    onSubmit,
    existingProjects
}: NewProjectDrawerProps) {
    // FORM STATE
    const [name, setName] = useState("");
    const [code, setCode] = useState("");
    const [projectNo, setProjectNo] = useState("");
    const [city, setCity] = useState("");
    const [client, setClient] = useState("");
    const [type, setType] = useState("design-build");
    const [stage, setStage] = useState("ko");
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Track manual overrides
    const [isCodeDirty, setIsCodeDirty] = useState(false);
    const [isNoDirty, setIsNoDirty] = useState(false);

    // Error State
    const [codeError, setCodeError] = useState("");
    const [noError, setNoError] = useState("");

    const suggestedNoRef = useRef("");

    // 1. Reset state when opening
    useEffect(() => {
        if (isOpen) {
            setIsNoDirty(false);
            setIsCodeDirty(false);
            setName("");
            setCode("");
            setCity("");
            setClient("");
            setCodeError("");
            setNoError("");
        }
    }, [isOpen]);

    // 2. Auto-Generate Project No
    useEffect(() => {
        if (isOpen) {
            const nextNo = calculateNextNo(existingProjects);
            suggestedNoRef.current = nextNo;
            if (!isNoDirty) {
                setProjectNo(nextNo);
            }
        }
    }, [isOpen, existingProjects, isNoDirty]);

    const calculateNextNo = (projects: Project[]) => {
        if (!projects || projects.length === 0) return "001";

        const maxNo = projects.reduce((max, p) => {
            // Check projectNumber (e.g. "001" or "PRJ-032")
            // Take only the last 3 digits if it's a number
            const matches = p.projectNumber.match(/(\d{3})$/) || p.projectNumber.match(/(\d+)/);
            const numStr = matches ? matches[0] : "";
            const num = parseInt(numStr, 10);
            return isNaN(num) ? max : Math.max(max, num);
        }, 0);

        const next = maxNo >= 999 ? 1 : maxNo + 1; // Wrap or stay within 3 digits comfortably
        return next.toString().padStart(3, "0");
    };

    // 2. Auto-Generate Code from Name
    useEffect(() => {
        if (!name || isCodeDirty) return;

        const suggested = generateSuggestedCode(name, existingProjects);
        setCode(suggested);
    }, [name, existingProjects, isCodeDirty]);

    const generateSuggestedCode = (projectName: string, projects: Project[]): string => {
        const words = projectName.trim().split(/\s+/).filter(w => w.length > 0);
        const cleanWords = words.map(w => w.replace(/[^a-zA-Z]/g, "").toUpperCase());

        let candidate = "";

        if (cleanWords.length === 1) {
            // 1 Word: first 3 letters
            const word = cleanWords[0];
            candidate = word.slice(0, 3).padEnd(3, "X");

            let offset = 3;
            while (projects.some(p => p.projectCode === candidate) && offset < word.length) {
                candidate = word.slice(0, 2) + word[offset];
                offset++;
            }
        } else if (cleanWords.length === 2) {
            // 2 Words: 2 letters of 1st word + 1 letter of 2nd word
            const w1 = cleanWords[0];
            const w2 = cleanWords[1];
            candidate = (w1.slice(0, 2) + w2.slice(0, 1)).padEnd(3, "X");

            let offset = 1;
            while (projects.some(p => p.projectCode === candidate) && offset < w2.length) {
                candidate = w1.slice(0, 2) + w2[offset];
                offset++;
            }
        } else {
            // 3+ Words: initials of first 3 words
            const w1 = cleanWords[0];
            const w2 = cleanWords[1];
            const w3 = cleanWords[2];
            candidate = (w1[0] + w2[0] + w3[0]).padEnd(3, "X");

            let wordIdx = 0;
            let charOffset = 1;
            while (projects.some(p => p.projectCode === candidate) && wordIdx < 3) {
                const targetWord = cleanWords[wordIdx];
                if (charOffset < targetWord.length) {
                    const parts = [w1[0], w2[0], w3[0]];
                    parts[wordIdx] = targetWord[charOffset];
                    candidate = parts.join("");
                    charOffset++;
                } else {
                    wordIdx++;
                    charOffset = 1;
                }
            }
        }

        return candidate.slice(0, 3);
    };

    // Validation
    useEffect(() => {
        let cErr = "";
        let nErr = "";

        // Code Validation
        if (code.length > 3) {
            cErr = "Maximum 3 characters suggested";
        }
        if (existingProjects.some(p => p.projectCode === code)) {
            cErr = "Code already taken by another project";
        }
        setCodeError(cErr);

        // Number Validation - Project number must be unique
        if (projectNo && existingProjects.some(p => p.projectNumber === projectNo)) {
            nErr = "Number already exists";
        }
        setNoError(nErr);

    }, [code, projectNo, existingProjects]);

    const handleResetNo = () => {
        setProjectNo(suggestedNoRef.current);
        setIsNoDirty(false);
    };

    const handleResetCode = () => {
        if (name) {
            setIsCodeDirty(false);
            // Effect will trigger re-gen
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !code || !city || isSubmitting) return;

        setIsSubmitting(true);
        await new Promise(r => setTimeout(r, 1000));

        onSubmit({
            projectName: name,
            projectCode: code,
            projectNumber: projectNo,
            location: { city },
            meta: {
                client,
                type,
                startDate,
                initialStage: stage,
                progress: 0
            },
            status: "on-track",
            updatedAt: new Date().toISOString(),
            createdAt: new Date().toISOString()
        });

        setIsSubmitting(false);
        onClose();
        setName("");
        setCode("");
        setCity("");
        setClient("");
        setIsNoDirty(false);
        setIsCodeDirty(false);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-end justify-center">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/10 backdrop-blur-[4px]"
                    />

                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 30, stiffness: 300, mass: 0.8 }}
                        className="relative w-full max-w-xl mx-2 mb-2 bg-white/80 dark:bg-black/70 backdrop-blur-2xl backdrop-saturate-[1.8] rounded-[48px] shadow-2xl overflow-hidden border border-white/40 dark:border-white/10 flex flex-col max-h-[92dvh]"
                    >
                        <div className="pt-4 pb-2 flex justify-center shrink-0">
                            <div className="w-12 h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-full" />
                        </div>

                        <div className="px-8 pt-4 pb-6 flex items-center justify-between shrink-0">
                            <div>
                                <h2 className="text-[24px] font-[800] text-neutral-900 dark:text-white tracking-tight">
                                    New Project
                                </h2>
                                <p className="text-neutral-500 dark:text-neutral-400 text-[13px] mt-0.5 font-bold">
                                    Fill in the details to create a new workspace.
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-11 h-11 rounded-full bg-white/50 dark:bg-neutral-800/50 backdrop-blur-xl border border-black/5 dark:border-white/5 flex items-center justify-center text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors active:scale-95"
                            >
                                <X size={22} strokeWidth={2.5} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-8 pb-10 space-y-8 scrollbar-hide">
                            {/* Section: Project Identity */}
                            <div className="space-y-5">
                                <div className="flex items-center gap-2 mb-1 px-1">
                                    <div className="w-7 h-7 rounded-lg bg-[#0A84FF]/10 flex items-center justify-center">
                                        <Info size={15} className="text-[#0A84FF]" strokeWidth={2.5} />
                                    </div>
                                    <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-400 dark:text-neutral-500">
                                        Identity
                                    </h3>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex gap-4">
                                        <div className="w-1/3 space-y-1.5">
                                            <div className="flex items-center justify-between px-4">
                                                <label className="text-[12px] font-bold text-neutral-400 dark:text-neutral-500">
                                                    No.
                                                </label>
                                                {isNoDirty && (
                                                    <button onClick={handleResetNo} className="text-[#0A84FF] hover:scale-110 active:rotate-[-90deg] transition-all">
                                                        <RotateCcw size={12} strokeWidth={3} />
                                                    </button>
                                                )}
                                            </div>
                                            <input
                                                value={projectNo}
                                                onChange={(e) => {
                                                    setProjectNo(e.target.value.replace(/\D/g, '').slice(0, 3));
                                                    setIsNoDirty(true);
                                                }}
                                                placeholder={suggestedNoRef.current}
                                                className={clsx(
                                                    "w-full h-[60px] bg-white/50 dark:bg-neutral-900 border rounded-full px-6 text-center font-mono font-[800] text-lg focus:outline-none transition-all",
                                                    noError
                                                        ? "border-red-500 text-red-600 focus:ring-4 focus:ring-red-500/10"
                                                        : (isNoDirty ? "border-[#0A84FF] text-[#0A84FF]" : "border-neutral-100 dark:border-neutral-800 text-neutral-400")
                                                )}
                                            />
                                            {noError && (
                                                <div className="flex items-center gap-1.5 ml-4 mt-1 text-red-500">
                                                    <AlertCircle size={10} strokeWidth={3} />
                                                    <p className="text-[10px] font-[800] uppercase tracking-wider">{noError}</p>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 space-y-1.5">
                                            <div className="flex items-center justify-between px-4">
                                                <label className="text-[12px] font-bold text-neutral-400 dark:text-neutral-500">
                                                    Project Code
                                                </label>
                                                {isCodeDirty && (
                                                    <button onClick={handleResetCode} className="text-[#0A84FF] hover:scale-110 active:rotate-[-90deg] transition-all">
                                                        <RotateCcw size={12} strokeWidth={3} />
                                                    </button>
                                                )}
                                            </div>
                                            <input
                                                value={code}
                                                onChange={(e) => {
                                                    setCode(e.target.value.toUpperCase());
                                                    setIsCodeDirty(true);
                                                }}
                                                placeholder="e.g. PRX"
                                                className={clsx(
                                                    "w-full h-[60px] bg-white/50 dark:bg-neutral-900 border rounded-full px-6 text-lg font-[800] focus:outline-none focus:ring-4 transition-all",
                                                    codeError
                                                        ? (codeError.includes("taken") ? "border-red-500 focus:ring-red-500/10 text-red-600" : "border-amber-500 focus:ring-amber-500/10 text-amber-600")
                                                        : (isCodeDirty ? "border-[#0A84FF] focus:border-[#0A84FF] focus:ring-[#0A84FF]/10 text-[#0A84FF]" : "border-neutral-200/50 dark:border-neutral-800 focus:border-[#0A84FF] focus:ring-[#0A84FF]/10 text-neutral-900 dark:text-white")
                                                )}
                                            />
                                            {codeError && (
                                                <div className={clsx("flex items-center gap-1.5 ml-4 mt-1", codeError.includes("taken") ? "text-red-500" : "text-amber-500")}>
                                                    <AlertCircle size={10} strokeWidth={3} />
                                                    <p className="text-[10px] font-[800] uppercase tracking-wider">{codeError}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[12px] font-bold text-neutral-400 dark:text-neutral-500 ml-6">
                                            Project Name
                                        </label>
                                        <input
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="Enter project name..."
                                            className="w-full h-[60px] bg-white/50 dark:bg-neutral-900 border border-neutral-200/50 dark:border-neutral-800 rounded-full px-8 text-lg font-[800] focus:outline-none focus:border-[#0A84FF] focus:ring-4 focus:ring-[#0A84FF]/10 text-neutral-900 dark:text-white transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section: Location & Client */}
                            <div className="space-y-5">
                                <div className="flex items-center gap-2 mb-1 px-1">
                                    <div className="w-7 h-7 rounded-lg bg-[#34C759]/10 flex items-center justify-center">
                                        <MapPin size={15} className="text-[#34C759]" strokeWidth={2.5} />
                                    </div>
                                    <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-400 dark:text-neutral-500">
                                        Context
                                    </h3>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[12px] font-bold text-neutral-400 dark:text-neutral-500 ml-6">
                                            City / Location
                                        </label>
                                        <input
                                            value={city}
                                            onChange={(e) => setCity(e.target.value)}
                                            placeholder="e.g. Jakarta Selatan"
                                            className="w-full h-[60px] bg-white/50 dark:bg-neutral-900 border border-neutral-200/50 dark:border-neutral-800 rounded-full px-8 text-lg font-[800] focus:outline-none focus:border-[#34C759] focus:ring-4 focus:ring-[#34C759]/10 text-neutral-900 dark:text-white transition-all"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[12px] font-bold text-neutral-400 dark:text-neutral-500 ml-6 flex items-center gap-1.5">
                                            <User size={14} className="text-neutral-400" />
                                            Client Name
                                        </label>
                                        <input
                                            value={client}
                                            onChange={(e) => setClient(e.target.value)}
                                            placeholder="e.g. PT Adidaya"
                                            className="w-full h-[60px] bg-white/50 dark:bg-neutral-900 border border-neutral-200/50 dark:border-neutral-800 rounded-full px-8 text-lg font-[800] focus:outline-none focus:ring-4 focus:ring-neutral-200/50 text-neutral-900 dark:text-white transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section: Project Setup */}
                            <div className="space-y-5">
                                <div className="flex items-center gap-2 mb-1 px-1">
                                    <div className="w-7 h-7 rounded-lg bg-[#FF9500]/10 flex items-center justify-center">
                                        <Briefcase size={15} className="text-[#FF9500]" strokeWidth={2.5} />
                                    </div>
                                    <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-400 dark:text-neutral-500">
                                        Setup
                                    </h3>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[12px] font-bold text-neutral-400 dark:text-neutral-500 ml-6">
                                            Type
                                        </label>
                                        <div className="relative">
                                            <select
                                                value={type}
                                                onChange={(e) => setType(e.target.value)}
                                                className="w-full h-[60px] appearance-none bg-white/50 dark:bg-neutral-900 border border-neutral-200/50 dark:border-neutral-800 rounded-full px-8 text-[15px] font-[800] text-neutral-900 dark:text-white focus:outline-none transition-all"
                                            >
                                                <option value="design-build">Design & Build</option>
                                                <option value="design">Design Only</option>
                                                <option value="build">Construction</option>
                                            </select>
                                            <ChevronDown size={14} className="absolute right-8 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[12px] font-bold text-neutral-400 dark:text-neutral-500 ml-6">
                                            Start Date
                                        </label>
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className="w-full h-[60px] bg-white/50 dark:bg-neutral-900 border border-neutral-200/50 dark:border-neutral-800 rounded-full px-8 text-[15px] font-[800] text-neutral-900 dark:text-white focus:outline-none transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[12px] font-bold text-neutral-400 dark:text-neutral-500 ml-6">
                                        Initial Stage
                                    </label>
                                    <div className="relative">
                                        <select
                                            value={stage}
                                            onChange={(e) => setStage(e.target.value)}
                                            className="w-full h-[60px] appearance-none bg-white/50 dark:bg-neutral-900 border border-neutral-200/50 dark:border-neutral-800 rounded-full px-8 text-[15px] font-[800] text-neutral-900 dark:text-white focus:outline-none transition-all"
                                        >
                                            {PROJECT_STAGES.map((s) => (
                                                <option key={s.key} value={s.key}>{s.label}</option>
                                            ))}
                                        </select>
                                        <ChevronDown size={14} className="absolute right-8 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-8 pb-10 border-t border-black/5 dark:border-white/5 bg-white/50 dark:bg-black/20 backdrop-blur-3xl shrink-0">
                            <button
                                onClick={handleSubmit}
                                disabled={!name || !code || !!codeError.includes("taken") || !!noError || !city || isSubmitting}
                                className={clsx(
                                    "w-full h-[64px] rounded-full flex items-center justify-center font-[800] text-lg transition-all active:scale-[0.98] shadow-2xl",
                                    (!name || !code || !!codeError.includes("taken") || !!noError || !city || isSubmitting)
                                        ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed"
                                        : "bg-[#0A84FF] text-white shadow-[#0A84FF]/25 hover:bg-[#007AFF] hover:shadow-[#007AFF]/30"
                                )}
                            >
                                {isSubmitting ? (
                                    <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    "Create Project Workspace"
                                )}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
