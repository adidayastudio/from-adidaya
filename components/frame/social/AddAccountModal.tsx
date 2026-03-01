"use client";

import { useState, useEffect } from "react";
import { X, Plus, ChevronDown } from "lucide-react";
import clsx from "clsx";
import { Platform, SocialAccount } from "./types/social.types";

type Props = {
    isOpen: boolean;
    onClose: () => void;
    onSave: (account: Omit<SocialAccount, "id"> & { id?: string; code?: string }) => void;
    accountToEdit?: SocialAccount;
    existingCodes?: string[];
};

const PLATFORM_OPTIONS: { value: Platform; label: string }[] = [
    { value: "INSTAGRAM", label: "Instagram" },
    { value: "TIKTOK", label: "TikTok" },
    { value: "LINKEDIN", label: "LinkedIn" },
    { value: "YOUTUBE", label: "YouTube" },
    { value: "FACEBOOK", label: "Facebook" },
];

export default function AddAccountModal({ isOpen, onClose, onSave, accountToEdit, existingCodes = [] }: Props) {
    const [form, setForm] = useState<{ platform: Platform; name: string; handle: string; code: string }>({
        platform: "INSTAGRAM",
        name: "",
        handle: "",
        code: ""
    });
    const [codeError, setCodeError] = useState<string>("");

    useEffect(() => {
        if (isOpen) {
            if (accountToEdit) {
                setForm({
                    platform: accountToEdit.platform,
                    name: accountToEdit.name,
                    handle: accountToEdit.handle,
                    code: accountToEdit.code || accountToEdit.name.slice(0, 3).toUpperCase()
                });
            } else {
                setForm({ platform: "INSTAGRAM", name: "", handle: "", code: "" });
            }
            setCodeError("");
        }
    }, [isOpen, accountToEdit]);

    // Auto-generate code from name
    useEffect(() => {
        if (form.name && !accountToEdit) {
            const autoCode = form.name.slice(0, 3).toUpperCase();
            setForm(f => ({ ...f, code: autoCode }));
        }
    }, [form.name, accountToEdit]);

    if (!isOpen) return null;

    const validateCode = (code: string) => {
        if (code.length !== 3) {
            return "Code must be exactly 3 characters";
        }
        if (existingCodes.includes(code) && code !== accountToEdit?.code) {
            return "This code is already in use";
        }
        return "";
    };

    const handleCodeChange = (value: string) => {
        const upperCode = value.toUpperCase().slice(0, 3);
        setForm(f => ({ ...f, code: upperCode }));
        setCodeError(validateCode(upperCode));
    };

    const handleSubmit = () => {
        if (!form.name || !form.handle) return;

        const error = validateCode(form.code);
        if (error) {
            setCodeError(error);
            return;
        }

        onSave({
            id: accountToEdit?.id,
            platform: form.platform,
            name: form.name,
            handle: form.handle,
            code: form.code
        });
        onClose();
    };

    const Label = ({ children }: { children: React.ReactNode }) => (
        <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em] px-2 block mb-1.5 font-sans">
            {children}
        </label>
    );

    const InputStyles = "w-full bg-white/40 backdrop-blur-md border border-black/5 rounded-full h-11 text-[14px] font-medium text-neutral-800 px-5 focus:bg-white focus:border-orange-200 outline-none transition-all shadow-sm shadow-black/[0.02] placeholder:text-neutral-300 font-sans";

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/10 backdrop-blur-[2px] z-[90] transition-all duration-500" onClick={onClose} />

            {/* Bottom Floating Drawer */}
            <div className="fixed bottom-2 left-2 right-2 bg-white/70 backdrop-blur-2xl backdrop-saturate-[1.8] border border-white/40 rounded-[56px] shadow-2xl z-[100] animate-in slide-in-from-bottom duration-500 overflow-hidden flex flex-col max-h-[85vh]">

                {/* Subtle Orange Glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-orange-400/15 blur-[100px] pointer-events-none" />

                {/* Drag Handle Indicator */}
                <div className="flex-shrink-0 pt-3 flex justify-center relative z-10">
                    <div className="w-10 h-1.5 rounded-full bg-neutral-200/50" />
                </div>

                {/* HEADER */}
                <div className="flex items-center justify-between px-8 py-6 relative z-10">
                    <h3 className="text-[22px] font-bold text-neutral-900 tracking-tight">
                        {accountToEdit ? "Update Account" : "Add Social Account"}
                    </h3>
                    <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/50 backdrop-blur-xl border border-black/5 flex items-center justify-center text-neutral-400 hover:text-neutral-900 active:scale-95 transition-all shadow-sm">
                        <X size={20} strokeWidth={1.5} />
                    </button>
                </div>

                {/* SCROLLABLE BODY */}
                <div className="flex-1 overflow-y-auto px-8 py-2 pb-8 space-y-8 relative z-10">
                    <div className="space-y-6">
                        {/* Platform field */}
                        <div>
                            <Label>Platform</Label>
                            <div className="relative w-full">
                                <select
                                    value={form.platform}
                                    onChange={(e) => setForm(f => ({ ...f, platform: e.target.value as Platform }))}
                                    className={clsx(InputStyles, "appearance-none pr-12 cursor-pointer")}
                                >
                                    {PLATFORM_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-300">
                                    <ChevronDown size={20} strokeWidth={1.5} />
                                </div>
                            </div>
                        </div>

                        {/* Name field */}
                        <div>
                            <Label>Account Name</Label>
                            <input
                                placeholder="e.g. Adidaya Studio"
                                value={form.name}
                                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                                className={InputStyles}
                            />
                        </div>

                        {/* Code field */}
                        <div>
                            <Label>Project Code</Label>
                            <div className="flex flex-col gap-2">
                                <input
                                    placeholder="ADI"
                                    value={form.code}
                                    onChange={(e) => handleCodeChange(e.target.value)}
                                    maxLength={3}
                                    className={clsx(InputStyles, "text-center font-bold uppercase tracking-[0.3em] text-orange-500")}
                                />
                                {codeError && <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider px-2">{codeError}</p>}
                            </div>
                        </div>

                        {/* Handle field */}
                        <div>
                            <Label>Public Handle</Label>
                            <input
                                placeholder="@handle"
                                value={form.handle}
                                onChange={(e) => setForm(f => ({ ...f, handle: e.target.value }))}
                                className={InputStyles}
                            />
                        </div>
                    </div>
                </div>

                {/* FOOTER */}
                <div className="px-8 pb-10 pt-4 flex flex-col gap-3 relative z-10">
                    <button
                        onClick={handleSubmit}
                        className="w-full bg-orange-500 text-white h-[64px] rounded-full font-bold text-[17px] active:scale-[0.98] transition-all shadow-xl shadow-orange-500/30 border border-white/20 ring-1 ring-inset ring-white/10"
                    >
                        {accountToEdit ? "Save Changes" : "Create Account"}
                    </button>
                </div>
            </div>
        </>
    );
}
