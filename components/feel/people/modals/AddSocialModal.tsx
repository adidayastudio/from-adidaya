"use client";

import { useState } from "react";
import { ModalRoot, ModalHeader } from "@/shared/ui/modal";
import { Button } from "@/shared/ui/primitives/button/button";
import { Input } from "@/shared/ui/primitives/input/input";
import {
    Instagram, Linkedin, Youtube, Facebook, Twitter, Chrome,
    Globe, Github, Send, MessageCircle
} from "lucide-react";
import clsx from "clsx";

type Platform = {
    id: string;
    label: string;
    icon: any;
};

const PLATFORMS: Platform[] = [
    { id: "linkedin", label: "LinkedIn", icon: Linkedin },
    { id: "instagram", label: "Instagram", icon: Instagram },
    { id: "x", label: "X (Twitter)", icon: Twitter },
    { id: "facebook", label: "Facebook", icon: Facebook },
    { id: "youtube", label: "YouTube", icon: Youtube },
    { id: "behance", label: "Behance", icon: Globe },
    { id: "dribbble", label: "Dribbble", icon: Globe },
    { id: "github", label: "GitHub", icon: Github },
    { id: "website", label: "Website", icon: Chrome },
    { id: "other", label: "Other", icon: PlusIcon }
];

function PlusIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M5 12h14" />
            <path d="M12 5v14" />
        </svg>
    );
}

type AddSocialModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (platform: string, handle: string) => void;
    existingPlatforms: string[];
};

export default function AddSocialModal({
    isOpen,
    onClose,
    onAdd,
    existingPlatforms
}: AddSocialModalProps) {
    const [selectedPlatform, setSelectedPlatform] = useState(PLATFORMS[0].id);
    const [customPlatform, setCustomPlatform] = useState("");
    const [handle, setHandle] = useState("");

    const handleAdd = () => {
        const platformKey = selectedPlatform === "other" ? customPlatform.toLowerCase().trim() : selectedPlatform;
        if (!platformKey || !handle) return;
        onAdd(platformKey, handle.trim());
        setHandle("");
        setCustomPlatform("");
        onClose();
    };

    const isPlatformDisabled = (id: string) => existingPlatforms.includes(id) && id !== "other";

    return (
        <ModalRoot open={isOpen} onOpenChange={onClose}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                <ModalHeader title="Add Social Account" onClose={onClose} />

                <div className="p-6 space-y-5">
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-neutral-400 tracking-wide">Select Platform</label>
                        <div className="grid grid-cols-2 gap-2">
                            {PLATFORMS.map((p) => {
                                const Icon = p.icon;
                                const isDisabled = isPlatformDisabled(p.id);
                                return (
                                    <button
                                        key={p.id}
                                        disabled={isDisabled}
                                        onClick={() => setSelectedPlatform(p.id)}
                                        className={clsx(
                                            "flex items-center gap-2.5 p-2 rounded-xl border text-left transition-all",
                                            selectedPlatform === p.id
                                                ? "bg-blue-50 border-blue-600 text-blue-700 shadow-sm"
                                                : "bg-white border-neutral-100 text-neutral-600 hover:border-neutral-200 hover:bg-neutral-50",
                                            isDisabled && "opacity-40 cursor-not-allowed grayscale"
                                        )}
                                    >
                                        <div className={clsx(
                                            "w-7 h-7 rounded-lg flex items-center justify-center border",
                                            selectedPlatform === p.id ? "bg-white border-blue-200" : "bg-neutral-50 border-neutral-100"
                                        )}>
                                            <Icon className="w-3.5 h-3.5" />
                                        </div>
                                        <span className="text-[11px] font-bold">{p.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {selectedPlatform === "other" && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                            <label className="text-[10px] uppercase font-bold text-neutral-400 tracking-wide">Platform Name</label>
                            <Input
                                placeholder="e.g. Behance, Portfolio"
                                value={customPlatform}
                                onChange={(e) => setCustomPlatform(e.target.value)}
                                className="h-10 text-sm"
                            />
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-neutral-400 tracking-wide">Username or URL</label>
                        <Input
                            placeholder={selectedPlatform === "website" ? "https://..." : "@username or handle"}
                            value={handle}
                            onChange={(e) => setHandle(e.target.value)}
                            className="h-10 text-sm"
                        />
                        <p className="text-[10px] text-neutral-400 italic">
                            For most platforms, just the username is enough.
                        </p>
                    </div>
                </div>

                <div className="p-4 border-t border-neutral-100 bg-neutral-50 flex justify-end gap-2">
                    <Button variant="secondary" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        className="bg-blue-600 hover:bg-blue-700 border-blue-600 text-white min-w-[100px]"
                        disabled={!handle || (selectedPlatform === "other" && !customPlatform)}
                        onClick={handleAdd}
                    >
                        Add Social
                    </Button>
                </div>
            </div>
        </ModalRoot>
    );
}
