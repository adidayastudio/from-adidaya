"use client";

import React, { useState, useEffect } from "react";
import { ArrowLeft, Plus, X } from "lucide-react";
import { SocialAccount, Platform } from "./types/social.types";
import { Button } from "@/shared/ui/primitives/button/button";
import { Input } from "@/shared/ui/primitives/input/input";
import { Select } from "@/shared/ui/primitives/select/select";

type Props = {
    account: SocialAccount;
    onSave: (data: Partial<SocialAccount> & { quota?: number; contentPillars?: string[] }) => void;
    onBack: () => void;
};

const PLATFORM_OPTIONS: { value: Platform; label: string }[] = [
    { value: "INSTAGRAM", label: "Instagram" },
    { value: "TIKTOK", label: "TikTok" },
    { value: "LINKEDIN", label: "LinkedIn" },
    { value: "YOUTUBE", label: "YouTube" },
    { value: "FACEBOOK", label: "Facebook" },
];

const DEFAULT_PILLARS = ["Showcase", "Educational", "Culture", "Thought Leadership", "Social Proof", "Entertainment"];

const PLATFORM_BADGE: Record<string, { code: string; color: string }> = {
    INSTAGRAM: { code: "Instagram", color: "text-pink-600 bg-pink-50" },
    TIKTOK: { code: "TikTok", color: "text-neutral-900 bg-neutral-100" },
    LINKEDIN: { code: "LinkedIn", color: "text-blue-700 bg-blue-50" },
    YOUTUBE: { code: "YouTube", color: "text-red-600 bg-red-50" },
    FACEBOOK: { code: "Facebook", color: "text-blue-600 bg-blue-50" }
};

export default function AccountSettingsPage({ account, onSave, onBack }: Props) {
    const [name, setName] = useState(account.name);
    const [handle, setHandle] = useState(account.handle);
    const [platform, setPlatform] = useState(account.platform);
    const [code, setCode] = useState(account.name.slice(0, 3).toUpperCase());
    const [quota, setQuota] = useState(24);
    const [pillars, setPillars] = useState<string[]>(DEFAULT_PILLARS);
    const [newPillar, setNewPillar] = useState("");

    const platformBadge = PLATFORM_BADGE[account.platform] || { code: account.platform, color: "bg-neutral-100" };
    const accountCode = account.name.slice(0, 3).toUpperCase();

    const handleSave = () => {
        onSave({
            id: account.id,
            name,
            handle,
            platform,
            quota,
            contentPillars: pillars
        });
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

    return (
        <div className="space-y-6">
            {/* HEADER with Account Context */}
            <div className="flex items-center gap-4">
                <button
                    onClick={onBack}
                    className="p-2 rounded-lg bg-neutral-100 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-700 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                </button>

                <div className="flex-1 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-500 text-sm font-bold">
                        {accountCode}
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-neutral-900">{account.name}</h1>
                        <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${platformBadge.color}`}>
                                {platformBadge.code}
                            </span>
                            <span className="text-xs text-neutral-400">Settings</span>
                        </div>
                    </div>
                </div>

                <Button variant="primary" size="sm" onClick={handleSave}>Save Changes</Button>
            </div>

            {/* BASIC INFO */}
            <div className="space-y-4">
                <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Basic Information</h3>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-xs text-neutral-500">Account Name</label>
                        <Input value={name} onChange={e => setName(e.target.value)} inputSize="sm" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs text-neutral-500">Platform</label>
                        <Select
                            value={platform}
                            options={PLATFORM_OPTIONS}
                            onChange={v => setPlatform(v as Platform)}
                            selectSize="sm"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-xs text-neutral-500">Handle</label>
                        <Input value={handle} onChange={e => setHandle(e.target.value)} inputSize="sm" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs text-neutral-500">Code (3 letters)</label>
                        <Input
                            value={code}
                            onChange={e => setCode(e.target.value.toUpperCase().slice(0, 3))}
                            inputSize="sm"
                            maxLength={3}
                            className="uppercase font-bold"
                        />
                    </div>
                </div>
            </div>

            <div className="border-t border-neutral-100" />

            {/* QUOTA */}
            <div className="space-y-4">
                <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Monthly Quota</h3>

                <div className="flex items-center gap-4">
                    <div className="space-y-1.5 w-32">
                        <label className="text-xs text-neutral-500">Posts per month</label>
                        <Input
                            type="number"
                            value={quota}
                            onChange={e => setQuota(parseInt(e.target.value) || 0)}
                            inputSize="sm"
                            min={1}
                            max={100}
                        />
                    </div>
                    <p className="text-xs text-neutral-400 mt-4">
                        Target number of published posts per month for this account.
                    </p>
                </div>
            </div>

            <div className="border-t border-neutral-100" />

            {/* CONTENT PILLARS */}
            <div className="space-y-4">
                <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Content Pillars</h3>

                <div className="flex flex-wrap gap-2">
                    {pillars.map(pillar => (
                        <span
                            key={pillar}
                            className="inline-flex items-center gap-1.5 bg-neutral-100 text-neutral-700 text-xs px-2.5 py-1 rounded-full"
                        >
                            {pillar}
                            <button
                                onClick={() => removePillar(pillar)}
                                className="text-neutral-400 hover:text-red-500 transition-colors"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    ))}
                </div>

                <div className="flex gap-2">
                    <Input
                        placeholder="Add new pillar..."
                        value={newPillar}
                        onChange={e => setNewPillar(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && addPillar()}
                        inputSize="sm"
                        className="w-48"
                    />
                    <Button variant="secondary" size="sm" onClick={addPillar} icon={<Plus className="w-3 h-3" />}>
                        Add
                    </Button>
                </div>
            </div>
        </div>
    );
}
