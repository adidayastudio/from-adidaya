"use client";

import React, { useState } from "react";
import { BookOpen, Map, Book } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/shared/ui/layout/Tabs";
import { CultureChapter } from "@/components/feel/culture/CultureChapter";
import { CultureJourney } from "@/components/feel/culture/CultureJourney";
import { CultureHandbook } from "@/components/feel/culture/CultureHandbook";

export default function PersonalGrowth() {
    const [activeTab, setActiveTab] = useState("chapter");

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h2 className="text-xl font-bold text-slate-900">My Growth</h2>
                <p className="text-sm text-slate-500">Track your journey, skills, and access the company handbook.</p>
            </div>

            <Tabs
                value={activeTab}
                onChange={setActiveTab}
                className="w-full mb-6 border-b border-neutral-200"
                items={[
                    { key: "chapter", label: <div className="flex items-center gap-2"><BookOpen className="w-4 h-4" /><span>Chapter</span></div> },
                    { key: "journey", label: <div className="flex items-center gap-2"><Map className="w-4 h-4" /><span>Journey</span></div> },
                    { key: "handbook", label: <div className="flex items-center gap-2"><Book className="w-4 h-4" /><span>Handbook</span></div> },
                ]}
            />

            {activeTab === "chapter" && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <CultureChapter />
                </div>
            )}

            {activeTab === "journey" && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <CultureJourney onNavigate={() => { }} />
                </div>
            )}

            {activeTab === "handbook" && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <CultureHandbook />
                </div>
            )}
        </div>
    );
}
