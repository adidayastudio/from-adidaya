"use client";

import React, { useState } from "react";
import { Heart, Activity, Award } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/shared/ui/layout/Tabs";
import { CultureValues } from "@/components/feel/culture/CultureValues";
import { CulturePulse } from "@/components/feel/culture/CulturePulse";
import { CultureRecognition } from "@/components/feel/culture/CultureRecognition";

export default function PersonalValues() {
    const [activeTab, setActiveTab] = useState("values");

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h2 className="text-xl font-bold text-slate-900">My Values</h2>
                <p className="text-sm text-slate-500">Align with company values, share feedback, and recognize peers.</p>
            </div>

            <Tabs
                value={activeTab}
                onChange={setActiveTab}
                className="w-full mb-6 border-b border-neutral-200"
                items={[
                    { key: "values", label: <div className="flex items-center gap-2"><Heart className="w-4 h-4" /><span>Values</span></div> },
                    { key: "pulse", label: <div className="flex items-center gap-2"><Activity className="w-4 h-4" /><span>Pulse</span></div> },
                    { key: "recognition", label: <div className="flex items-center gap-2"><Award className="w-4 h-4" /><span>Recognition</span></div> },
                ]}
            />

            {activeTab === "values" && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <CultureValues />
                </div>
            )}

            {activeTab === "pulse" && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <CulturePulse />
                </div>
            )}

            {activeTab === "recognition" && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <CultureRecognition />
                </div>
            )}
        </div>
    );
}
