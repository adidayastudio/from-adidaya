"use client";

import React, { useState } from "react";
import { Settings, Book } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/shared/ui/layout/Tabs";
import { CultureSetup } from "@/components/feel/culture/CultureSetup";
import { CultureHandbook } from "@/components/feel/culture/CultureHandbook";

export default function TeamCulture() {
    const [activeTab, setActiveTab] = useState("settings");

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h2 className="text-xl font-bold text-slate-900">Team Culture</h2>
                <p className="text-sm text-slate-500">Manage culture settings and the company handbook.</p>
            </div>

            <Tabs
                value={activeTab}
                onChange={setActiveTab}
                className="w-full mb-6 border-b border-neutral-200"
                items={[
                    { key: "settings", label: <div className="flex items-center gap-2"><Settings className="w-4 h-4" /><span>Settings</span></div> },
                    { key: "handbook", label: <div className="flex items-center gap-2"><Book className="w-4 h-4" /><span>Handbook</span></div> },
                ]}
            />

            {activeTab === "settings" && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <CultureSetup onNavigate={() => { }} />
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
